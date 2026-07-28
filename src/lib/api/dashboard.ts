import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockDashboardCharts,
  mockDashboardSummary,
} from "@/lib/mock-data";
import type {
  DashboardChartsResponse,
  DashboardSummaryResponse,
} from "@/types/api";

export function getDashboardSummary(params?: {
  start_date?: string;
  end_date?: string;
  billing_month?: string;
}) {
  if (isDevelopmentMode()) return mockDashboardSummary(params);
  return apiFetch<DashboardSummaryResponse>("/v2/dashboard/summary", {
    params,
  });
}

export function getDashboardCharts(params?: {
  range?: "day" | "week" | "month";
  granularity?: "day" | "week" | "month";
}) {
  if (isDevelopmentMode()) return mockDashboardCharts(params);
  return apiFetch<DashboardChartsResponse>("/v2/dashboard/charts", {
    params: {
      range: params?.range ?? "week",
      granularity: params?.granularity ?? "day",
    },
  });
}
