import { getAccessToken } from "@/lib/auth-storage";
import type {
  SearchSuggestResponse,
  SearchSyncResponse,
} from "@/lib/search/types";

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchSearchSuggestions(
  query: string,
  limit = 10,
): Promise<SearchSuggestResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const response = await fetch(`/api/search/suggest?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Search request failed");
  }

  return (await response.json()) as SearchSuggestResponse;
}

export async function syncSearchIndex(): Promise<SearchSyncResponse> {
  const response = await fetch("/api/search/sync", {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  });

  const data = (await response.json()) as SearchSyncResponse & {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Search sync failed");
  }

  return data as SearchSyncResponse;
}

export async function getSearchStatus() {
  const response = await fetch("/api/search/sync", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return { configured: false };
  return (await response.json()) as {
    configured: boolean;
    index?: string;
  };
}
