import { queryOptions } from "@tanstack/react-query";

import { healthFetch } from "@/lib/api";
import {
  getDashboardCharts,
  getDashboardSummary,
} from "@/lib/api/dashboard";
import { getShopActivity } from "@/lib/api/shops";
import type { HealthResponse } from "@/types/api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  charts: (range: "day" | "week" | "month") =>
    [...dashboardKeys.all, "charts", { range, granularity: "day" }] as const,
  health: () => [...dashboardKeys.all, "health"] as const,
  shopActivity: (params: {
    page?: number;
    limit?: number;
    backlog_page?: number;
    backlog_limit?: number;
  }) => [...dashboardKeys.all, "shop-activity", params] as const,
};

export function dashboardSummaryQuery() {
  return queryOptions({
    queryKey: dashboardKeys.summary(),
    queryFn: () => getDashboardSummary(),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });
}

export function dashboardChartsQuery(
  range: "day" | "week" | "month",
) {
  return queryOptions({
    queryKey: dashboardKeys.charts(range),
    queryFn: () =>
      getDashboardCharts({
        range,
        granularity: "day",
      }),
    staleTime: 2 * 60_000,
    refetchInterval: 90_000,
  });
}

export function systemHealthQuery() {
  return queryOptions({
    queryKey: dashboardKeys.health(),
    queryFn: () => healthFetch<HealthResponse>(),
    staleTime: 30_000,
    refetchInterval: 45_000,
  });
}

export function shopOpsActivityQuery(
  params: {
    page?: number;
    limit?: number;
    backlog_page?: number;
    backlog_limit?: number;
  } = { page: 1, limit: 20, backlog_page: 1, backlog_limit: 20 },
) {
  return queryOptions({
    queryKey: dashboardKeys.shopActivity(params),
    queryFn: () => getShopActivity(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
