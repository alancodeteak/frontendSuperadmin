"use client";

import { useEffect, useState } from "react";
import {
  BikeIcon,
  BracesIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  EyeIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  ReceiptTextIcon,
  StoreIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { AnalyticsPdfViewer } from "@/components/reports/analytics-pdf-viewer";
import { ExcelPreview } from "@/components/reports/excel-preview";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, triggerBrowserDownload } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { exportShopReport, fetchShopReportBlob } from "@/lib/api/reports";
import { getShop, listShops } from "@/lib/api/shops";
import { parseExcelBlob, type ExcelWorkbookPreview } from "@/lib/excel";
import { buildShopAnalyticsPdf, downloadShopAnalyticsPdf } from "@/lib/pdf";
import { filterReportStatusCounts } from "@/lib/orders/order-status";
import { cn } from "@/lib/utils";
import type { ReportDataset, ShopDeliverySettings, ShopListItem } from "@/types/api";

type DatasetMeta = {
  value: ReportDataset;
  label: string;
  description: string;
  formats: string;
  icon: typeof ReceiptTextIcon;
};

const DATASETS: DatasetMeta[] = [
  {
    value: "orders",
    label: "Orders",
    description: "Order rows with totals, status and timestamps.",
    formats: "XLSX",
    icon: ReceiptTextIcon,
  },
  {
    value: "customers",
    label: "Customers",
    description: "Customer records with contact details and activity.",
    formats: "XLSX",
    icon: UsersIcon,
  },
  {
    value: "delivery_partners",
    label: "Delivery partners",
    description: "Riders linked to the shop and their assignments.",
    formats: "XLSX",
    icon: BikeIcon,
  },
  {
    value: "venue_pickers",
    label: "Venue pickers",
    description: "Venue picker accounts, scope and activity for the shop.",
    formats: "XLSX",
    icon: ClipboardListIcon,
  },
  {
    value: "analytics",
    label: "Analytics KPIs",
    description: "KPI summary as a printable PDF or raw JSON.",
    formats: "PDF · JSON",
    icon: TrendingUpIcon,
  },
];

const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function toIsoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatRangeLabel(start: string, end: string) {
  if (!start && !end) return "All time";
  if (start && end) return `${start} → ${end}`;
  return start ? `From ${start}` : `Until ${end}`;
}

export default function ReportsPage() {
  const [shops, setShops] = useState<ShopListItem[]>([]);
  const [shopId, setShopId] = useState("");
  const [dataset, setDataset] = useState<ReportDataset>("orders");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jsonPreview, setJsonPreview] = useState<Record<string, unknown> | null>(
    null,
  );
  const [workbook, setWorkbook] = useState<ExcelWorkbookPreview | null>(null);
  const [previewBlob, setPreviewBlob] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [pdfBlob, setPdfBlob] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [shopDelivery, setShopDelivery] = useState<ShopDeliverySettings | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void listShops({ page: 1, limit: 100 })
      .then((data) => {
        if (!active) return;
        setShops(data.items ?? []);
        setShopId((current) => current || data.items?.[0]?.shop_id || "");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load shops");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!shopId) {
      setShopDelivery(null);
      return;
    }
    let active = true;
    void getShop(shopId)
      .then((detail) => {
        if (!active) return;
        setShopDelivery(detail.delivery ?? null);
      })
      .catch(() => {
        if (!active) return;
        setShopDelivery(null);
      });
    return () => {
      active = false;
    };
  }, [shopId]);

  useEffect(() => {
    setWorkbook(null);
    setPreviewBlob(null);
    setJsonPreview(null);
    setPdfBlob(null);
    setMessage(null);
    setError(null);
  }, [shopId, dataset, startDate, endDate]);

  async function onPreview() {
    if (!shopId) {
      setError("Select a shop first");
      return;
    }
    if (dataset === "analytics") {
      setError("Use Load analytics JSON / Download PDF for analytics.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setJsonPreview(null);
    try {
      const file = await fetchShopReportBlob(shopId, {
        dataset,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const parsed = await parseExcelBlob(file.blob, file.filename);
      setPreviewBlob(file);
      setWorkbook(parsed);
      setMessage(`Preview ready · ${file.filename}`);
    } catch (err) {
      setWorkbook(null);
      setPreviewBlob(null);
      const msg = err instanceof ApiError ? err.message : "Preview failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onDownloadXlsx() {
    if (!shopId) {
      setError("Select a shop first");
      return;
    }
    if (dataset === "analytics") {
      setError("Analytics exports as JSON/PDF, not XLSX.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (previewBlob) {
        triggerBrowserDownload(previewBlob.blob, previewBlob.filename);
        setMessage(`Downloaded ${previewBlob.filename}`);
        appToast.success(`Downloaded ${previewBlob.filename}`);
        return;
      }

      const result = await exportShopReport(shopId, {
        dataset,
        format: "xlsx",
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      if (result && typeof result === "object" && "downloaded" in result) {
        const file = result as {
          downloaded: true;
          filename: string;
          blob?: Blob;
        };
        setMessage(`Downloaded ${file.filename}`);
        appToast.success(`Downloaded ${file.filename}`);
        if (file.blob) {
          setPreviewBlob({ blob: file.blob, filename: file.filename });
          setWorkbook(await parseExcelBlob(file.blob, file.filename));
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Export failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onExportAnalyticsJson() {
    if (!shopId) {
      setError("Select a shop first");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setWorkbook(null);
    setPreviewBlob(null);
    try {
      const result = await exportShopReport(shopId, {
        dataset: "analytics",
        format: "json",
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setJsonPreview(result as Record<string, unknown>);
      setMessage("Analytics JSON loaded.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Export failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onPreviewPdf() {
    if (!shopId) {
      setError("Select a shop first");
      return;
    }
    if (!startDate) {
      setError("Select a start date for the analytics report");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setPdfBlob(null);
    try {
      const result = await exportShopReport(shopId, {
        dataset: "analytics",
        format: "json",
        start_date: startDate,
        end_date: endDate || startDate,
      });
      const selectedShop = shops.find((shop) => shop.shop_id === shopId);
      const analyticsData = result as Record<string, unknown>;
      const filteredPreview = {
        ...analyticsData,
        status_counts: filterReportStatusCounts(
          (analyticsData.status_counts as Record<string, number>) ?? {},
          shopDelivery,
        ),
      };
      const blob = buildShopAnalyticsPdf(
        filteredPreview,
        selectedShop?.shop_name,
        shopDelivery,
      );
      const shopIdPart = analyticsData.shop_id ?? shopId;
      const filename = `analytics-${String(shopIdPart)}-${startDate}.pdf`;
      setJsonPreview(filteredPreview);
      setPdfBlob({ blob, filename });
      setMessage("Analytics PDF ready to preview.");
      appToast.success("Analytics PDF ready.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "PDF generation failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onDownloadPdf() {
    if (!shopId) {
      setError("Select a shop first");
      return;
    }
    if (!startDate) {
      setError("Select a start date for the analytics report");
      return;
    }

    // If we already have the blob from preview, just download it directly.
    if (pdfBlob) {
      downloadShopAnalyticsPdf(
        jsonPreview ?? {},
        shops.find((s) => s.shop_id === shopId)?.shop_name,
        shopDelivery,
      );
      appToast.success(`Downloaded ${pdfBlob.filename}`);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await exportShopReport(shopId, {
        dataset: "analytics",
        format: "json",
        start_date: startDate,
        end_date: endDate || startDate,
      });
      const selectedShop = shops.find((shop) => shop.shop_id === shopId);
      const analyticsData = result as Record<string, unknown>;
      const filteredPreview = {
        ...analyticsData,
        status_counts: filterReportStatusCounts(
          (analyticsData.status_counts as Record<string, number>) ?? {},
          shopDelivery,
        ),
      };
      downloadShopAnalyticsPdf(
        filteredPreview,
        selectedShop?.shop_name,
        shopDelivery,
      );
      const blob = buildShopAnalyticsPdf(
        filteredPreview,
        selectedShop?.shop_name,
        shopDelivery,
      );
      const shopIdPart = analyticsData.shop_id ?? shopId;
      const filename = `analytics-${String(shopIdPart)}-${startDate}.pdf`;
      setJsonPreview(filteredPreview);
      setPdfBlob({ blob, filename });
      setMessage("Analytics PDF downloaded.");
      appToast.success("Analytics PDF downloaded.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "PDF export failed";
      setError(msg);
      appToast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setStartDate(toIsoDay(start));
    setEndDate(toIsoDay(end));
  }

  const isXlsxDataset = dataset !== "analytics";
  const activeDataset =
    DATASETS.find((item) => item.value === dataset) ?? DATASETS[0];
  const selectedShop = shops.find((shop) => shop.shop_id === shopId) ?? null;
  const hasResult = Boolean(workbook || jsonPreview || pdfBlob);

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a dataset, preview the exact spreadsheet, then download it.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Select value={shopId} onValueChange={(v) => setShopId(v ?? "")}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.shop_id} value={shop.shop_id}>
                    {shop.shop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 rounded-lg border bg-background px-1.5 py-1">
              <CalendarRangeIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <Input
                type="date"
                className="h-6 w-[7.5rem] border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                className="h-6 w-[7.5rem] border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
              />
              {RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => applyPreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {isXlsxDataset ? (
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => void onPreview()}
              >
                <EyeIcon className="size-3.5" />
                {loading ? "Loading…" : "Preview"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={() => void onPreviewPdf()}
                >
                  <EyeIcon className="size-3.5" />
                  {loading ? "Generating…" : "Preview PDF"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void onDownloadPdf()}
                >
                  <FileDownIcon className="size-3.5" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
            <StoreIcon className="size-3.5" />
            {selectedShop?.shop_name ?? "No shop selected"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
            <CalendarRangeIcon className="size-3.5" />
            {formatRangeLabel(startDate, endDate)}
          </span>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DATASETS.map((item) => {
          const Icon = item.icon;
          const active = item.value === dataset;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setDataset(item.value)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors",
                active
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "bg-card hover:border-foreground/20 hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </span>
              <span className="mt-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {item.formats}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">
            {activeDataset.label} export
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {message ?? activeDataset.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isXlsxDataset ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void onDownloadXlsx()}
            >
              <FileDownIcon className="size-3.5" />
              Download XLSX
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => void onPreviewPdf()}
              >
                <EyeIcon className="size-3.5" />
                {loading ? "Generating…" : "Preview PDF"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void onDownloadPdf()}
              >
                <FileDownIcon className="size-3.5" />
                Download PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {loading && !hasResult ? (
        <LoadingState label="Building report…" />
      ) : null}

      {workbook ? <ExcelPreview workbook={workbook} /> : null}

      {pdfBlob ? (
        <AnalyticsPdfViewer
          blob={pdfBlob.blob}
          filename={pdfBlob.filename}
          onClose={() => setPdfBlob(null)}
          className="mt-2"
        />
      ) : null}

      {jsonPreview && !pdfBlob ? (
        <div className="overflow-hidden rounded-2xl border bg-slate-950 text-slate-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BracesIcon className="size-3.5" />
              <span>analytics.json</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              className="h-6 border-white/15 bg-transparent px-2 text-[10px] text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => void onPreviewPdf()}
            >
              <EyeIcon className="size-3" />
              Preview PDF
            </Button>
          </div>
          <pre className="max-h-[16rem] overflow-auto p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(jsonPreview, null, 2)}
          </pre>
        </div>
      ) : null}

      {!loading && !error && !hasResult ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileSpreadsheetIcon className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">
            {isXlsxDataset ? "Nothing previewed yet" : "No analytics loaded yet"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {isXlsxDataset
              ? "Preview shows the exact spreadsheet contents before you download the file."
              : "Preview renders a full chart PDF — status breakdown, order trends, KPI summary, and delivery partners."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {isXlsxDataset ? (
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => void onPreview()}
              >
                <EyeIcon className="size-3.5" />
                Preview report
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={() => void onPreviewPdf()}
                >
                  <EyeIcon className="size-3.5" />
                  Preview PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void onDownloadPdf()}
                >
                  <FileDownIcon className="size-3.5" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
