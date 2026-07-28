export type SearchHitType =
  | "shop"
  | "rider"
  | "pos"
  | "invoice"
  | "page";

export type SearchHit = {
  id: string;
  type: SearchHitType;
  title: string;
  subtitle?: string;
  href: string;
  shop_id?: string;
  keywords?: string;
};

export type SearchSuggestResponse = {
  query: string;
  engine: "meilisearch" | "federated";
  processingTimeMs: number;
  suggestions: SearchHit[];
};

export type SearchSyncResponse = {
  ok: true;
  engine: "meilisearch";
  indexed: number;
  breakdown: Record<SearchHitType, number>;
  processingTimeMs: number;
};
