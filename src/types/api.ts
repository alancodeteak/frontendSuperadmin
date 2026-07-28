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
  user_id: number;
  ecom_enabled?: boolean;
  ecom_order_confirmation_enabled?: boolean;
  scheduled_order?: boolean;
  merge_order?: boolean;
  return_option?: boolean;
  customer_ticket?: boolean;
  ecom_slug?: string;
  phone?: string;
  email?: string;
  address?: ShopAddress;
};

export type ShopDetail = ShopListItem & {
  features?: ShopFeatures;
  delivery?: unknown;
  subscription?: unknown;
  promotion?: unknown;
  ecom?: unknown;
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

export type PosTemplateSummary = {
  id: number | string;
  name: string;
  provider?: string;
  version?: string;
  connector_type?: string;
  description?: string | null;
  is_system?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PosTemplate = PosTemplateSummary & {
  config?: Record<string, unknown>;
  [key: string]: unknown;
};

export type PosShopLink = {
  shop_id?: string;
  mapping_profile_id?: number | string;
  provider?: string;
  connector_type?: string;
  is_active?: boolean;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  order_pull_enabled?: boolean;
  [key: string]: unknown;
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

