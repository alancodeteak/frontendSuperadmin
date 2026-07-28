import { queryOptions } from "@tanstack/react-query";

import {
  getAnalyticsCustomers,
  getAnalyticsRestaurants,
  getAnalyticsSubscriptions,
  getAnalyticsTickets,
} from "@/lib/api/analytics";

export const analyticsKeys = {
  all: ["analytics"] as const,
  restaurants: (params: Record<string, unknown>) =>
    [...analyticsKeys.all, "restaurants", params] as const,
  tickets: (params: Record<string, unknown>) =>
    [...analyticsKeys.all, "tickets", params] as const,
  customers: (params: Record<string, unknown>) =>
    [...analyticsKeys.all, "customers", params] as const,
  subscriptions: (params: Record<string, unknown>) =>
    [...analyticsKeys.all, "subscriptions", params] as const,
};

export function analyticsRestaurantsQuery(params: {
  page?: number;
  limit?: number;
  range?: "day" | "week" | "month";
  sort_by?: "revenue" | "delivered_orders" | "on_time_percent";
  sort_dir?: "asc" | "desc";
}) {
  return queryOptions({
    queryKey: analyticsKeys.restaurants(params),
    queryFn: () => getAnalyticsRestaurants(params),
  });
}

export function analyticsTicketsQuery(params: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return queryOptions({
    queryKey: analyticsKeys.tickets(params),
    queryFn: () => getAnalyticsTickets(params),
  });
}

export function analyticsCustomersQuery(params: {
  page?: number;
  limit?: number;
  shop_id?: string;
}) {
  return queryOptions({
    queryKey: analyticsKeys.customers(params),
    queryFn: () => getAnalyticsCustomers(params),
  });
}

export function analyticsSubscriptionsQuery(params: {
  page?: number;
  limit?: number;
  billing_month?: string;
}) {
  return queryOptions({
    queryKey: analyticsKeys.subscriptions(params),
    queryFn: () => getAnalyticsSubscriptions(params),
  });
}
