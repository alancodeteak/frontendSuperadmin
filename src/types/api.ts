export type Paginated<T> = {
  items: T[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
};

export type ShopStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "blocked"
  | "deleted";

export type ShopAddress = {
  address_line_1?: string | null;
  address_line_2?: string | null;
  locality?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_number?: string | null;
};

export type ShopFeatures = {
  ecom_enabled?: boolean;
  ecom_order_confirmation_enabled?: boolean;
  ecom_slug?: string | null;
  return_option?: boolean;
  scheduled_order?: boolean;
  merge_order?: boolean;
  customer_ticket?: boolean;
  integration_enabled?: boolean;
  integration_rate_limit?: number;
  has_integration_token?: boolean;
  is_msg_activated?: boolean;
  single_msg?: boolean;
  vat_enabled?: boolean;
  vat?: number;
};

export type ShopProfile = {
  shop_name?: string | null;
  second_name?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  photo_url?: string | null;
  shop_license_no?: string | null;
  contact_person_number?: string | null;
  contact_person_email?: string | null;
  upi_id?: string | null;
  vat_enabled?: boolean;
  vat?: string | number | null;
  enable_promotion?: boolean;
};

export type ShopListItem = {
  shop_id: string;
  user_id?: number;
  shop_name: string;
  phone?: string | null;
  email?: string | null;
  status?: ShopStatus | string;
  is_deleted?: boolean | null;
  photo?: string | null;
  photo_url?: string | null;
  profile?: ShopProfile | null;
  ecom_enabled?: boolean;
  ecom_slug?: string | null;
  ecom_order_confirmation_enabled?: boolean;
  scheduled_order?: boolean;
  merge_order?: boolean;
  address?: ShopAddress | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateShopInput = {
  shop_name: string;
  shop_id: string;
  password: string;
  /** 100000–999999; omitted → API auto-allocates */
  user_id?: number;
  ecom_slug?: string | null;
  ecom_enabled?: boolean;
  ecom_order_confirmation_enabled?: boolean;
  scheduled_order?: boolean;
  merge_order?: boolean;
  return_option?: boolean;
  customer_ticket?: boolean;
  second_name?: string | null;
  status?: ShopStatus | string;
  status_reason?: string | null;
  vat_enabled?: boolean;
  vat?: number | string;
  enable_promotion?: boolean;
  upi_id?: string | null;
  integration_enabled?: boolean;
  integration_rate_limit?: number;
  is_msg_activated?: boolean;
  single_msg?: boolean;
  phone?: string;
  email?: string;
  contact_person_number?: string | null;
  contact_person_email?: string | null;
  group_id?: number | string | null;
  shop_license_no?: string | null;
  address?: ShopAddress;
  delivery?: ShopDeliverySettings;
  ecom?: ShopEcomSettings;
};

export type ShopDeliverySettings = {
  delivery_time?: number | null;
  self_assigned?: boolean | null;
  pickup_disabled?: boolean | null;
  bonus_penalty?: boolean | null;
  bonus_penalty_start_status?: string | null;
  common_penalty_enabled?: boolean | null;
  common_penalty_idle_minutes?: number | null;
  common_penalty_min_online_minutes?: number | null;
  [key: string]: unknown;
};

export type ShopPromotionSettings = {
  promotion_link?: string | null;
  promotion_header?: string | null;
  promotion_content?: string | null;
  promotion_image_s3_key?: string | null;
  is_marketing_enabled?: boolean | null;
  [key: string]: unknown;
};

export type ShopEcomSettings = {
  /** Hostname only; unique when set. Send null on PATCH to clear. */
  domain?: string | null;
  min_order_amount?: string | number | null;
  delivery_radius_km?: string | number | null;
  /** Flat delivery fee shown on the storefront checkout. */
  delivery_charge?: string | number | null;
  cooking_notes_enabled?: boolean | null;
  delivery_instructions_enabled?: boolean | null;
  cutlery_enabled?: boolean | null;
  /**
   * Week map: sun–sat → slots `{ open, close }` in HH:MM.
   * Empty array = closed that day.
   */
  operating_hours?: Record<
    string,
    Array<{ open: string; close: string }>
  > | null;
  payment_methods?: unknown;
  whatsapp_order_template?: string | null;
  /** Write-only on create/patch; never returned */
  theme_config?: unknown;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string | null;
  robots_index?: boolean | null;
  /** Write-only on create/patch; never returned */
  structured_data?: unknown;
  [key: string]: unknown;
};

/** PATCH /api/v2/shops/:shop_id — flat profile/feature keys + nested upserts. */
export type PatchShopInput = {
  shop_name?: string;
  second_name?: string | null;
  phone?: string | null;
  email?: string | null;
  shop_license_no?: string | null;
  contact_person_number?: string | null;
  contact_person_email?: string | null;
  status?: ShopStatus | string;
  status_reason?: string | null;
  group_id?: number | string | null;
  ecom_enabled?: boolean;
  ecom_order_confirmation_enabled?: boolean;
  ecom_slug?: string | null;
  return_option?: boolean;
  scheduled_order?: boolean;
  merge_order?: boolean;
  customer_ticket?: boolean;
  vat_enabled?: boolean;
  vat?: number | string | null;
  enable_promotion?: boolean;
  integration_enabled?: boolean;
  integration_rate_limit?: number;
  upi_id?: string | null;
  is_msg_activated?: boolean;
  single_msg?: boolean;
  /** Nested address upsert; null clears shop address link */
  address?: ShopAddress | null;
  delivery?: ShopDeliverySettings;
  ecom?: ShopEcomSettings;
  photo_base64?: string;
  photo_content_type?: string;
  clear_photo?: boolean;
};

/** Sparse PATCH response — only groups for keys that were sent. */
export type PatchShopResponse = {
  shop_id: string;
  updated_at?: string;
  status?: ShopStatus | string;
  status_reason?: string | null;
  group_id?: number | string | null;
  profile?: ShopProfile;
  features?: ShopFeatures;
  address?: ShopAddress | null;
  delivery?: ShopDeliverySettings | null;
  ecom?: ShopEcomSettings | null;
  /** One-time plaintext when integration is first enabled */
  integration_token?: string;
};

/** POST /v2/shops/:shop_id/rotate-integration-token */
export type RotateIntegrationTokenResponse = {
  shop_id: string;
  updated_at?: string;
  token_rotated: boolean;
  features?: Pick<
    ShopFeatures,
    "integration_enabled" | "has_integration_token"
  >;
  /** One-time plaintext — previous token is invalid */
  integration_token: string;
};

export type ShopDetail = ShopListItem & {
  status_reason?: string | null;
  group_id?: string | number | null;
  subscription_id?: string | number | null;
  features?: ShopFeatures;
  delivery?: ShopDeliverySettings | null;
  subscription?: Record<string, unknown> | null;
  promotion?: ShopPromotionSettings | null;
  ecom?: ShopEcomSettings | null;
  products?: Paginated<ShopProduct> | ShopProduct[];
  [key: string]: unknown;
};

export type ShopProduct = {
  id?: string | number;
  product_name?: string | null;
  product_name_alt?: string | null;
  /** @deprecated Prefer product_name */
  name?: string | null;
  description?: string | null;
  price?: string | number | null;
  vat_rate?: string | number | null;
  is_vat_inclusive?: boolean;
  img_url?: string | null;
  category_id?: string | number | null;
  status?: string | null;
  availability?: string | null;
  diet_type?: string | null;
  sort_order?: number | null;
  seo_slug?: string | null;
  pos_product_id?: string | null;
  /** @deprecated Prefer pos_product_id */
  pos_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ShopActivityEvent = {
  at?: string;
  event?: string;
  shop_id?: string;
  shop_name?: string;
  [key: string]: unknown;
};

export type ShopBacklogItem = {
  id?: string;
  shop?: string;
  shop_id?: string;
  age_min?: number;
  status?: string;
  [key: string]: unknown;
};

export type ShopActivityResponse = {
  activity?: {
    total?: number;
    items?: ShopActivityEvent[];
    [key: string]: unknown;
  };
  order_counts?: {
    today?: number;
    pending?: number;
    completed?: number;
    cancelled?: number;
    total?: number;
    [key: string]: unknown;
  };
  backlog?: {
    total?: number;
    items?: ShopBacklogItem[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type Rider = {
  delivery_partner_id?: string;
  third_party_id?: string;
  first_name?: string;
  last_name?: string;
  phone1?: string;
  age?: number;
  status?: string;
  is_deleted?: boolean;
  is_blocked?: boolean;
  online_status?: string;
  photo?: string;
  emirates_id?: string;
  license_image?: string;
  vehicle_detail?: string;
  [key: string]: unknown;
};

export type CreateRiderInput = {
  first_name: string;
  last_name?: string;
  password: string;
  age: number;
  phone1: string;
  third_party_id?: string;
  photo?: string;
  emirates_id?: string;
  license_image?: string;
  vehicle_detail?: string;
  delivery_partner_id?: string;
};

/** Flattened on list; full `config` only on GET by id / create / patch / clone. */
export type PosTemplateSummary = {
  id: number;
  name: string;
  provider: string;
  version: string;
  connector_type: string;
  lane?: string | null;
  description?: string | null;
  is_system?: boolean;
  is_active?: boolean;
  capabilities?: {
    catalog?: string;
    orders_out?: string;
    orders_in?: string;
    status_out?: string;
    status_in?: string;
    riders?: string;
  } | null;
  events?: {
    order_create_on?: string[];
    status_out_on?: string[];
  } | null;
  status_maps?: {
    outbound?: Record<string, unknown>;
    inbound?: Record<string, unknown>;
    export?: Record<string, unknown>;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export type PosTemplate = PosTemplateSummary & {
  /** Present on detail / write responses only. */
  config?: Record<string, unknown>;
};

export type PosShopLink = {
  id?: number;
  shop_id: string;
  mapping_profile_id: number;
  mapping_profile_name?: string | null;
  provider: string;
  connector_type: string;
  lane?: string | null;
  is_active?: boolean;
  config_overrides?: Record<string, unknown> | null;
  config_version?: number | null;
  has_credentials?: boolean;
  webhook_secret_configured?: boolean;
  integration_token_present?: boolean;
  integration_token_fingerprint_present?: boolean;
  integration_enabled?: boolean;
  /** Saleculator: Features token can be used as Inmenu link_token. */
  link_token_ready?: boolean;
  setup_guide?: {
    title?: string;
    link_token_hint?: string;
    device_auth?: string;
    template?: string;
    steps?: string[];
  } | null;
  warnings?: string[];
  capabilities?: Record<string, unknown> | null;
  events?: {
    order_create_on?: string[];
    status_out_on?: string[];
  } | null;
  status_maps?: Record<string, unknown> | null;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  order_pull_enabled?: boolean;
  last_catalog_sync_at?: string | null;
  last_order_sync_at?: string | null;
  sync_error?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** GET /v2/pos/shops/:shopId/sync-status */
export type PosSyncStatus = {
  shop_id: string;
  provider?: string | null;
  connector_type?: string | null;
  lane?: string | null;
  is_active?: boolean;
  integration_enabled?: boolean;
  integration_token_present?: boolean;
  integration_token_fingerprint_present?: boolean;
  link_token_ready?: boolean;
  setup_guide?: PosShopLink["setup_guide"];
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  order_pull_enabled?: boolean;
  last_catalog_sync_at?: string | null;
  last_order_sync_at?: string | null;
  sync_error?: string | null;
  config_version?: number | null;
  warnings?: string[];
};

/** POST /v2/pos/templates — required fields locked to API contract. */
export type CreatePosTemplateInput = {
  name: string;
  provider: string;
  version: string;
  connector_type: string;
  description?: string;
  is_system?: boolean;
  is_active?: boolean;
  config: Record<string, unknown>;
};

/** PATCH /v2/pos/templates/:id — only these keys are accepted. */
export type UpdatePosTemplateInput = {
  description?: string;
  is_active?: boolean;
  version?: string;
  config?: Record<string, unknown>;
};

/** PUT /v2/pos/shops/:shopId/link — attach / upsert body. */
export type AttachPosShopLinkInput = {
  mapping_profile_id: number;
  provider: string;
  connector_type: string;
  is_active?: boolean;
  config_overrides?: Record<string, unknown>;
  credentials_plaintext?: string;
  webhook_secret?: string;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  order_pull_enabled?: boolean;
  capabilities?: Record<string, unknown>;
};

/** PATCH /v2/pos/shops/:shopId/link/features — at least one field required. */
export type PatchPosLinkFeaturesInput = {
  is_active?: boolean;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  order_pull_enabled?: boolean;
};

export type PosTestMapInput = {
  mapping_section: string;
  sample_payload: Record<string, unknown>;
};

export type PosTestMapResponse = {
  mapping_section: string;
  mapped: Record<string, unknown>;
};

export type PosTestConnectionInput = {
  endpoint_key:
    | "menu"
    | "menuCategories"
    | "menuProducts"
    | "orderCreate"
    | "orderStatus"
    | "riderSync";
  shop_id?: string;
};

export type PosTestConnectionResponse = {
  endpoint_key: string;
  url?: string | null;
  ok: boolean;
  status_code?: number | null;
  latency_ms?: number | null;
  error?: string | null;
};

export type AuthVerifyResponse = {
  access_token: string;
  refresh_token: string;
  role?: string;
  email?: string;
  [key: string]: unknown;
};

export type HealthResponse = {
  status?: string;
  checks?:
    | Record<string, unknown>
    | Array<{ name?: string; ok?: boolean; latencyMs?: number }>;
  [key: string]: unknown;
};

export type DashboardSummaryResponse = {
  total_shops_registered: number;
  active_restaurants: number;
  todays_orders: number;
  platform_revenue: string;
  total_customers: number;
  active_tickets: number;
  customers_under_shops: number;
  yaadro_current_month_revenue: string;
  timezone: "Asia/Dubai" | string;
  as_of: string;
};

export type TimeSeriesPoint = {
  bucket: string;
  value: string;
  count: number;
};

export type RestaurantPerformanceRow = {
  shop_id: string;
  shop_name: string;
  delivered_orders: number;
  revenue: string;
  on_time_deliveries: number;
  on_time_percent: number;
};

export type DashboardChartsResponse = {
  range: "day" | "week" | "month";
  granularity: "day" | "week" | "month";
  start_date: string;
  end_date: string;
  timezone: "Asia/Dubai" | string;
  revenue_analytics: TimeSeriesPoint[];
  restaurant_performance: RestaurantPerformanceRow[];
  yaadro_revenue_analytics: TimeSeriesPoint[];
  subscription_analytics: {
    pending: number;
    issued: number;
    paid: number;
    failed: number;
    overdue: number;
    void: number;
  };
  order_trends: {
    breakfast: number;
    lunch: number;
    dinner: number;
    other: number;
  };
  activity: {
    latest_shops: Array<{
      shop_id: string;
      shop_name: string;
      created_at: string;
    }>;
    latest_groups: Array<{
      id: number;
      name: string;
      created_at: string;
    }>;
  };
  as_of: string;
};

export type InvoiceStatus =
  | "PENDING"
  | "ISSUED"
  | "PAID"
  | "OVERDUE"
  | "VOID"
  | "FAILED"
  | string;

export type Invoice = {
  id?: string | number;
  invoice_id?: string | number;
  invoice_number?: string;
  shop_id?: string;
  shop_name?: string;
  subscription_id?: number | string;
  document_type?: "INVOICE" | "BILL" | string;
  shop?: {
    shop_id?: string;
    shop_name?: string;
    vat_enabled?: boolean;
    vat_rate?: string | number;
  };
  status: InvoiceStatus;
  /** Derived UI field or legacy mock; API uses billing_period_* */
  billing_month?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  amount?: string | number;
  discount?: string | number;
  other_charges?: string | number;
  vat?: string | number;
  total?: string | number;
  description?: string | null;
  transaction_reference?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type AnalyticsTicket = {
  id: number | string;
  user_id?: string;
  user_role?: string;
  order_id?: number | string | null;
  shop_id?: string;
  status?: string;
  reason?: string | null;
  images?: Array<string | Record<string, unknown>>;
  created_at?: string;
  [key: string]: unknown;
};

export type AnalyticsCustomerRow = {
  shop_id?: string;
  shop_name?: string;
  customers?: number;
  active_customers?: number;
  total_orders?: number;
  [key: string]: unknown;
};

export type ReportDataset =
  | "orders"
  | "customers"
  | "delivery_partners"
  | "analytics";

export type TriggerShopLogoutResponse = {
  status: "accepted";
  event_id: string;
  shop_id: string;
  occurred_at: string;
};

