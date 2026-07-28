import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockAnalyticsCustomers,
  mockAnalyticsRestaurants,
  mockAnalyticsSubscriptions,
  mockAnalyticsTickets,
} from "@/lib/mock-data";
import type {
  AnalyticsCustomerRow,
  AnalyticsTicket,
  Invoice,
  Paginated,
  RestaurantPerformanceRow,
} from "@/types/api";

export function getAnalyticsRestaurants(params?: {
  page?: number;
  limit?: number;
  range?: "day" | "week" | "month";
  start_date?: string;
  end_date?: string;
  sort_by?: "revenue" | "delivered_orders" | "on_time_percent";
  sort_dir?: "asc" | "desc";
}) {
  if (isDevelopmentMode()) return mockAnalyticsRestaurants(params);
  return apiFetch<Paginated<RestaurantPerformanceRow>>(
    "/v2/analytics/restaurants",
    { params },
  );
}

export function getAnalyticsTickets(params?: {
  page?: number;
  limit?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  if (isDevelopmentMode()) return mockAnalyticsTickets(params);
  return apiFetch<Paginated<AnalyticsTicket>>("/v2/analytics/tickets", {
    params,
  });
}

export function getAnalyticsCustomers(params?: {
  page?: number;
  limit?: number;
  shop_id?: string;
}) {
  if (isDevelopmentMode()) return mockAnalyticsCustomers(params);
  return apiFetch<Paginated<AnalyticsCustomerRow>>("/v2/analytics/customers", {
    params,
  });
}

export function getAnalyticsSubscriptions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  billing_month?: string;
}) {
  if (isDevelopmentMode()) return mockAnalyticsSubscriptions(params);
  return apiFetch<Paginated<Invoice>>("/v2/analytics/subscriptions", {
    params,
  });
}
