import type { SearchHit, SearchHitType } from "@/lib/search/types";

export const STATIC_PAGE_HITS: SearchHit[] = [
  {
    id: "page:dashboard",
    type: "page",
    title: "Dashboard",
    subtitle: "Overview · KPIs · charts",
    href: "/dashboard",
    keywords: "home overview summary",
  },
  {
    id: "page:shops",
    type: "page",
    title: "Shops",
    subtitle: "Manage restaurants",
    href: "/shops",
    keywords: "restaurants stores",
  },
  {
    id: "page:shops-new",
    type: "page",
    title: "Create shop",
    subtitle: "Onboard a new restaurant",
    href: "/shops/new",
    keywords: "add new restaurant",
  },
  {
    id: "page:groups",
    type: "page",
    title: "Groups",
    subtitle: "Group admins · shop assignment",
    href: "/groups",
    keywords: "group admin franchise assign shops",
  },
  {
    id: "page:groups-new",
    type: "page",
    title: "Create group",
    subtitle: "Add a group admin account",
    href: "/groups/new",
    keywords: "add new group admin",
  },
  {
    id: "page:pos",
    type: "page",
    title: "POS",
    subtitle: "Templates and shop links",
    href: "/pos",
    keywords: "point of sale connector templates",
  },
  {
    id: "page:reports",
    type: "page",
    title: "Reports",
    subtitle: "Export XLSX · PDF · analytics",
    href: "/reports",
    keywords: "export download excel spreadsheet",
  },
  {
    id: "page:analytics",
    type: "page",
    title: "Analytics",
    subtitle: "Restaurants · tickets · customers",
    href: "/analytics",
    keywords: "performance tickets subscriptions",
  },
  {
    id: "page:invoice",
    type: "page",
    title: "Invoices",
    subtitle: "Billing and payments",
    href: "/invoice",
    keywords: "billing subscription pay",
  },
  {
    id: "page:settings",
    type: "page",
    title: "Settings",
    subtitle: "Account · cookies · preferences",
    href: "/settings",
    keywords: "preferences cookies",
  },
];

type ShopLike = {
  shop_id: string;
  shop_name?: string;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  ecom_slug?: string | null;
  user_id?: number | null;
};

type PosLike = {
  id: number | string;
  name?: string;
  provider?: string;
  version?: string;
  connector_type?: string;
  description?: string | null;
  is_active?: boolean;
};

type InvoiceLike = {
  id?: string | number;
  invoice_id?: string | number;
  invoice_number?: string;
  shop_id?: string;
  shop_name?: string;
  status?: string;
  billing_month?: string;
  billing_period_start?: string;
  shop?: { shop_id?: string; shop_name?: string };
};

type RiderLike = {
  delivery_partner_id?: string;
  first_name?: string;
  last_name?: string;
  phone1?: string;
  online_status?: string;
  is_blocked?: boolean;
};

export function shopToHit(shop: ShopLike): SearchHit {
  const bits = [
    shop.shop_id,
    shop.phone,
    shop.email,
    shop.ecom_slug,
    shop.user_id != null ? String(shop.user_id) : null,
    shop.status,
  ].filter(Boolean);

  return {
    id: `shop:${shop.shop_id}`,
    type: "shop",
    title: shop.shop_name || shop.shop_id,
    subtitle: [shop.shop_id, shop.status, shop.phone].filter(Boolean).join(" · "),
    href: `/shops/${shop.shop_id}`,
    shop_id: shop.shop_id,
    keywords: bits.join(" "),
  };
}

export function posToHit(template: PosLike): SearchHit {
  return {
    id: `pos:${template.id}`,
    type: "pos",
    title: template.name || `Template ${template.id}`,
    subtitle: [template.provider, template.connector_type, template.version]
      .filter(Boolean)
      .join(" · "),
    href: `/pos/${template.id}`,
    keywords: [
      template.name,
      template.provider,
      template.connector_type,
      template.description,
      template.is_active === false ? "inactive" : "active",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function invoiceToHit(invoice: InvoiceLike): SearchHit {
  const routeId = String(invoice.invoice_id ?? invoice.id ?? "");
  const number = invoice.invoice_number ?? routeId;
  const shopName =
    invoice.shop?.shop_name ?? invoice.shop_name ?? invoice.shop_id ?? "";
  const month =
    invoice.billing_month ??
    (invoice.billing_period_start
      ? invoice.billing_period_start.slice(0, 7)
      : undefined);

  return {
    id: `invoice:${routeId || number}`,
    type: "invoice",
    title: number ? `Invoice ${number}` : "Invoice",
    subtitle: [shopName, invoice.status, month].filter(Boolean).join(" · "),
    href: routeId ? `/invoice/${routeId}` : "/invoice",
    shop_id: invoice.shop_id ?? invoice.shop?.shop_id,
    keywords: [number, shopName, invoice.status, month, invoice.shop_id]
      .filter(Boolean)
      .join(" "),
  };
}

export function riderToHit(shopId: string, rider: RiderLike): SearchHit {
  const id = String(rider.delivery_partner_id ?? "");
  const name = [rider.first_name, rider.last_name].filter(Boolean).join(" ");
  return {
    id: `rider:${shopId}:${id}`,
    type: "rider",
    title: name || id || "Rider",
    subtitle: [id, rider.phone1, rider.online_status, shopId]
      .filter(Boolean)
      .join(" · "),
    href: `/shops/${shopId}?tab=riders`,
    shop_id: shopId,
    keywords: [name, id, rider.phone1, shopId].filter(Boolean).join(" "),
  };
}

export function countByType(hits: SearchHit[]) {
  const breakdown: Record<SearchHitType, number> = {
    shop: 0,
    rider: 0,
    pos: 0,
    invoice: 0,
    page: 0,
  };
  for (const hit of hits) breakdown[hit.type] += 1;
  return breakdown;
}

function scoreHit(hit: SearchHit, q: string) {
  const needle = q.toLowerCase().trim();
  if (!needle) return 0;
  const title = hit.title.toLowerCase();
  const subtitle = (hit.subtitle ?? "").toLowerCase();
  const keywords = (hit.keywords ?? "").toLowerCase();
  const hay = `${title} ${subtitle} ${keywords}`;

  if (title === needle) return 100;
  if (title.startsWith(needle)) return 90;
  if (title.includes(needle)) return 75;
  if (subtitle.includes(needle)) return 55;
  if (keywords.includes(needle)) return 40;
  // token match
  const tokens = needle.split(/\s+/).filter(Boolean);
  const matched = tokens.filter((t) => hay.includes(t)).length;
  return matched ? 20 + matched * 5 : 0;
}

export function filterRankHits(hits: SearchHit[], q: string, limit: number) {
  return hits
    .map((hit) => ({ hit, score: scoreHit(hit, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.hit);
}
