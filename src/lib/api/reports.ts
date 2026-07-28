import {
  apiDownload,
  apiFetch,
  triggerBrowserDownload,
} from "@/lib/api";
import {
  isDevelopmentMode,
  mockExportAnalyticsJson,
  mockExportReportBlob,
} from "@/lib/mock-data";
import type { ReportDataset } from "@/types/api";

export type ReportExportParams = {
  dataset: ReportDataset;
  format?: "xlsx" | "json";
  start_date?: string;
  end_date?: string;
  delivery_partner_id?: string;
  top_limit?: number;
};

export async function fetchShopReportBlob(
  shopId: string,
  params: Omit<ReportExportParams, "format"> & { format?: "xlsx" },
) {
  if (isDevelopmentMode()) {
    return mockExportReportBlob(shopId, params);
  }

  return apiDownload(`/v2/shops/${shopId}/reports/export`, {
    params: {
      dataset: params.dataset,
      format: "xlsx",
      start_date: params.start_date,
      end_date: params.end_date,
      delivery_partner_id: params.delivery_partner_id,
      top_limit: params.top_limit,
    },
  });
}

export async function exportShopReport(
  shopId: string,
  params: ReportExportParams,
) {
  const format =
    params.format ?? (params.dataset === "analytics" ? "json" : "xlsx");

  if (format === "json") {
    if (isDevelopmentMode()) {
      return mockExportAnalyticsJson(shopId, params);
    }
    return apiFetch<Record<string, unknown>>(
      `/v2/shops/${shopId}/reports/export`,
      {
        params: {
          dataset: params.dataset,
          format: "json",
          start_date: params.start_date,
          end_date: params.end_date,
          delivery_partner_id: params.delivery_partner_id,
          top_limit: params.top_limit,
        },
      },
    );
  }

  const { blob, filename } = await fetchShopReportBlob(shopId, {
    dataset: params.dataset,
    start_date: params.start_date,
    end_date: params.end_date,
    delivery_partner_id: params.delivery_partner_id,
    top_limit: params.top_limit,
  });
  triggerBrowserDownload(blob, filename);
  return { downloaded: true as const, filename, blob };
}
