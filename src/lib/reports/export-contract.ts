import type { ReportDataset } from "@/types/api";

/** Datasets that require start_date on GET /v2/shops/:id/reports/export. */
export const REPORT_DATASETS_REQUIRING_START_DATE = new Set<ReportDataset>([
  "orders",
  "delivery_partners",
  "venue_pickers",
  "analytics",
]);

export function reportExportRequiresStartDate(dataset: ReportDataset): boolean {
  return REPORT_DATASETS_REQUIRING_START_DATE.has(dataset);
}
