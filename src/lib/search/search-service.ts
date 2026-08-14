import {
  STATIC_PAGE_HITS,
  countByType,
  filterRankHits,
  invoiceToHit,
  posToHit,
  riderToHit,
  shopToHit,
} from "@/lib/search/documents";
import {
  getMeilisearchClient,
  getSuperadminIndexName,
  isMeilisearchConfigured,
} from "@/lib/search/meilisearch-client";
import type {
  SearchHit,
  SearchSuggestResponse,
  SearchSyncResponse,
} from "@/lib/search/types";
import { PHONE_POLICY_VERSION, PHONE_POLICY_VERSION_HEADER } from "@yaadro/phone-kit";

function adminApiBase() {
  const raw = (
    process.env.API_PROXY_TARGET ?? "https://superadmin-api.yaadro.ae"
  ).trim();
  return raw.replace(/\\/g, "/").replace(/\/$/, "");
}

async function adminFetch<T>(
  path: string,
  authHeader: string | null,
  params?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const url = new URL(`${adminApiBase()}/api${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  try {
    const apiKey =
      process.env.ADMIN_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_ADMIN_API_KEY?.trim();
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        [PHONE_POLICY_VERSION_HEADER]: PHONE_POLICY_VERSION,
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type Paginated<T> = {
  items?: T[];
  total?: number;
  total_pages?: number;
};

async function collectCatalog(authHeader: string | null): Promise<SearchHit[]> {
  const hits: SearchHit[] = [...STATIC_PAGE_HITS];

  const shops = await adminFetch<Paginated<Record<string, unknown>>>(
    "/v2/shops",
    authHeader,
    { page: 1, limit: 100 },
  );
  const shopItems = (shops?.items ?? []) as Array<{
    shop_id: string;
    shop_name?: string;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
    ecom_slug?: string | null;
    user_id?: number | null;
  }>;

  for (const shop of shopItems) {
    hits.push(shopToHit(shop));
  }

  const templates = await adminFetch<Paginated<Record<string, unknown>>>(
    "/v2/pos/templates",
    authHeader,
    { page: 1, limit: 100 },
  );
  for (const row of templates?.items ?? []) {
    hits.push(
      posToHit(
        row as {
          id: number | string;
          name?: string;
          provider?: string;
          version?: string;
          connector_type?: string;
          description?: string | null;
          is_active?: boolean;
        },
      ),
    );
  }

  const invoices = await adminFetch<Paginated<Record<string, unknown>>>(
    "/v2/billing/invoices",
    authHeader,
    { page: 1, limit: 100 },
  );
  for (const row of invoices?.items ?? []) {
    hits.push(invoiceToHit(row as Parameters<typeof invoiceToHit>[0]));
  }

  // Index riders for the first shops to keep sync fast.
  for (const shop of shopItems.slice(0, 25)) {
    const riders = await adminFetch<Paginated<Record<string, unknown>>>(
      `/v2/shops/${shop.shop_id}/riders`,
      authHeader,
      { page: 1, limit: 50 },
    );
    for (const rider of riders?.items ?? []) {
      hits.push(
        riderToHit(
          shop.shop_id,
          rider as {
            delivery_partner_id?: string;
            first_name?: string;
            last_name?: string;
            phone1?: string;
            online_status?: string;
            is_blocked?: boolean;
          },
        ),
      );
    }
  }

  return hits;
}

async function ensureIndex() {
  const client = getMeilisearchClient();
  if (!client) return null;
  const indexName = getSuperadminIndexName();
  const index = client.index(indexName);

  try {
    await client.createIndex(indexName, { primaryKey: "id" });
  } catch {
    // index may already exist
  }

  await index.updateSettings({
    searchableAttributes: ["title", "subtitle", "keywords", "shop_id", "type"],
    filterableAttributes: ["type", "shop_id"],
    sortableAttributes: ["title"],
    displayedAttributes: [
      "id",
      "type",
      "title",
      "subtitle",
      "href",
      "shop_id",
      "keywords",
    ],
  });

  return index;
}

export async function syncSearchIndex(
  authHeader: string | null,
): Promise<SearchSyncResponse> {
  if (!isMeilisearchConfigured()) {
    throw new Error("Meilisearch is not configured");
  }

  const started = performance.now();
  const index = await ensureIndex();
  if (!index) throw new Error("Meilisearch client unavailable");

  const documents = await collectCatalog(authHeader);
  const task = await index.addDocuments(documents, { primaryKey: "id" });
  await getMeilisearchClient()!.tasks.waitForTask(task.taskUid, {
    timeout: 60_000,
  });

  return {
    ok: true,
    engine: "meilisearch",
    indexed: documents.length,
    breakdown: countByType(documents),
    processingTimeMs: Math.round(performance.now() - started),
  };
}

async function suggestFromMeilisearch(
  query: string,
  limit: number,
): Promise<SearchSuggestResponse | null> {
  const client = getMeilisearchClient();
  if (!client) return null;

  const started = performance.now();
  const index = client.index(getSuperadminIndexName());

  try {
    const result = await index.search(query, {
      limit,
      attributesToRetrieve: [
        "id",
        "type",
        "title",
        "subtitle",
        "href",
        "shop_id",
        "keywords",
      ],
    });

    return {
      query,
      engine: "meilisearch",
      processingTimeMs: Math.round(performance.now() - started),
      suggestions: result.hits as SearchHit[],
    };
  } catch {
    return null;
  }
}

async function suggestFederated(
  query: string,
  limit: number,
  authHeader: string | null,
): Promise<SearchSuggestResponse> {
  const started = performance.now();
  const hits: SearchHit[] = [...STATIC_PAGE_HITS];

  const [shops, templates, invoices] = await Promise.all([
    adminFetch<Paginated<Record<string, unknown>>>("/v2/shops", authHeader, {
      page: 1,
      limit: 20,
      q: query,
    }),
    adminFetch<Paginated<Record<string, unknown>>>(
      "/v2/pos/templates",
      authHeader,
      { page: 1, limit: 50 },
    ),
    adminFetch<Paginated<Record<string, unknown>>>(
      "/v2/billing/invoices",
      authHeader,
      { page: 1, limit: 50 },
    ),
  ]);

  for (const shop of shops?.items ?? []) {
    hits.push(shopToHit(shop as Parameters<typeof shopToHit>[0]));
  }
  for (const row of templates?.items ?? []) {
    hits.push(posToHit(row as Parameters<typeof posToHit>[0]));
  }
  for (const row of invoices?.items ?? []) {
    hits.push(invoiceToHit(row as Parameters<typeof invoiceToHit>[0]));
  }

  // Light rider probe: search first matching shops' riders client-side.
  for (const shop of (shops?.items ?? []).slice(0, 5) as Array<{
    shop_id: string;
  }>) {
    const riders = await adminFetch<Paginated<Record<string, unknown>>>(
      `/v2/shops/${shop.shop_id}/riders`,
      authHeader,
      { page: 1, limit: 30, q: query },
    );
    for (const rider of riders?.items ?? []) {
      hits.push(
        riderToHit(shop.shop_id, rider as Parameters<typeof riderToHit>[1]),
      );
    }
  }

  return {
    query,
    engine: "federated",
    processingTimeMs: Math.round(performance.now() - started),
    suggestions: filterRankHits(hits, query, limit),
  };
}

export async function suggestSearch(
  query: string,
  limit = 10,
  authHeader: string | null = null,
): Promise<SearchSuggestResponse> {
  const q = query.trim();
  if (!q) {
    return {
      query,
      engine: isMeilisearchConfigured() ? "meilisearch" : "federated",
      processingTimeMs: 0,
      suggestions: STATIC_PAGE_HITS.slice(0, limit),
    };
  }

  if (isMeilisearchConfigured()) {
    const fromMeili = await suggestFromMeilisearch(q, limit);
    if (fromMeili && fromMeili.suggestions.length > 0) return fromMeili;
    // Empty Meili index → fall through and also try federated, then optionally return empty meili result
    if (fromMeili) {
      const federated = await suggestFederated(q, limit, authHeader);
      if (federated.suggestions.length > 0) return federated;
      return fromMeili;
    }
  }

  return suggestFederated(q, limit, authHeader);
}
