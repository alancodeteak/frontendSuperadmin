"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  filterReportStatusCounts,
  formatOrderStatusLabel,
} from "@/lib/orders/order-status";
import type { ShopDeliverySettings } from "@/types/api";

// ─── tiny canvas chart helpers ───────────────────────────────────────────────

type BarDatum = { label: string; value: number; color: string };

/** Render a horizontal bar chart onto a canvas element and return it. */
function makeBarCanvas(
  data: BarDatum[],
  width = 480,
  height = 220,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const pad = { left: 90, right: 16, top: 14, bottom: 14 };
  const barH = 18;
  const gap = 12;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barAreaW = width - pad.left - pad.right;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  data.forEach((d, i) => {
    const y = pad.top + i * (barH + gap);
    const barW = (d.value / maxVal) * barAreaW;

    // label
    ctx.font = "10px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.textAlign = "right";
    ctx.fillText(
      d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label,
      pad.left - 6,
      y + barH / 2 + 3.5,
    );

    // bar bg
    ctx.fillStyle = "#e2e8f0";
    ctx.roundRect(pad.left, y, barAreaW, barH, 3);
    ctx.fill();

    // bar fill
    if (barW > 0) {
      ctx.fillStyle = d.color;
      ctx.roundRect(pad.left, y, barW, barH, 3);
      ctx.fill();
    }

    // value
    ctx.font = "bold 9px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "left";
    ctx.fillText(String(d.value), pad.left + barAreaW + 4, y + barH / 2 + 3.5);
  });

  return canvas;
}

type DonutDatum = { label: string; value: number; color: string };

/** Render a donut chart onto a canvas element and return it. */
function makeDonutCanvas(
  data: DonutDatum[],
  size = 180,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.4;
  const innerR = outerR * 0.6;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, size, size);

  let angle = -Math.PI / 2;
  for (const d of data) {
    const sweep = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angle, angle + sweep);
    ctx.arc(cx, cy, innerR, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    angle += sweep;
  }

  // centre text
  ctx.font = `bold ${Math.round(size * 0.12)}px -apple-system, Helvetica, sans-serif`;
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(total), cx, cy - 6);
  ctx.font = `${Math.round(size * 0.09)}px -apple-system, Helvetica, sans-serif`;
  ctx.fillStyle = "#64748b";
  ctx.fillText("total", cx, cy + 9);

  return canvas;
}

function canvasToDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/png");
}

function addLegend(
  doc: jsPDF,
  data: Array<{ label: string; color: string; value: number }>,
  x: number,
  y: number,
  colWidth = 45,
) {
  const perRow = Math.floor((doc.internal.pageSize.getWidth() - x * 2) / colWidth);
  data.forEach((item, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const lx = x + col * colWidth;
    const ly = y + row * 8;

    doc.setFillColor(item.color);
    doc.roundedRect(lx, ly - 3, 6, 4, 1, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.label} (${item.value})`, lx + 8, ly);
  });
  const rows = Math.ceil(data.length / perRow);
  return y + rows * 8 + 4;
}

type PdfCell = string | number | boolean | null | undefined;

type DownloadTablePdfOptions = {
  title: string;
  subtitle?: string;
  filename: string;
  columns: string[];
  rows: PdfCell[][];
  metadata?: Array<[string, PdfCell]>;
};

function cellText(value: PdfCell): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function safeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addDocumentHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  metadata: Array<[string, PdfCell]> = [],
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(117, 71, 204);
  doc.rect(0, 0, pageWidth, 6, "F");

  doc.setTextColor(23, 23, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 14, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    subtitle || `Generated ${new Date().toLocaleString("en-AE")}`,
    14,
    26,
  );

  let y = 33;
  if (metadata.length > 0) {
    doc.setFontSize(8.5);
    for (const [label, value] of metadata) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`${label}:`, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(cellText(value), 44, y);
      y += 5;
    }
  }

  return y;
}

function addPageFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, height - 12, width - 14, height - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Restaurant Superadmin · UAE ECOM", 14, height - 7);
    doc.text(`Page ${page} of ${pages}`, width - 14, height - 7, {
      align: "right",
    });
  }
}

export function downloadTablePdf({
  title,
  subtitle,
  filename,
  columns,
  rows,
  metadata = [],
}: DownloadTablePdfOptions) {
  const landscape = columns.length >= 5;
  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const startY = addDocumentHeader(doc, title, subtitle, metadata);

  autoTable(doc, {
    startY: startY + 2,
    head: [columns],
    body:
      rows.length > 0
        ? rows.map((row) => row.map(cellText))
        : [[{ content: "No data available", colSpan: columns.length }]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [117, 71, 204],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addPageFooter(doc);
  doc.save(`${safeFilename(filename) || "report"}.pdf`);
}

function objectRows(
  value: unknown,
  label: string,
): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    `${label} · ${key.replace(/_/g, " ")}`,
    typeof item === "object" ? JSON.stringify(item) : cellText(item as PdfCell),
  ]);
}

/** Build a rich analytics PDF and return it as a Blob (no side-effects). */
export function buildShopAnalyticsPdf(
  data: Record<string, unknown>,
  shopName?: string,
  delivery?: ShopDeliverySettings | null,
): Blob {
  const shopId = cellText(data.shop_id as PdfCell);
  const range = data.date_range as Record<string, unknown> | undefined;
  const dateLabel = range
    ? `${cellText((range.start ?? range.start_date) as PdfCell)} to ${cellText((range.end ?? range.end_date) as PdfCell)}`
    : "Selected date range";

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const ACCENT = [117, 71, 204] as const;
  const SLATE = [30, 41, 59] as const;
  const MUTED = [100, 116, 139] as const;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Analytics Report", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${shopName || shopId} · ${dateLabel}`, 14, 21);

  doc.setFontSize(9);
  doc.text(
    `Generated ${new Date().toLocaleString("en-AE")}`,
    W - 14,
    21,
    { align: "right" },
  );

  let y = 36;

  // ── KPI chips row ───────────────────────────────────────────────────────────
  type KpiEntry = { label: string; value: string };
  const totals = (data.totals ?? {}) as Record<string, unknown>;
  const kpis: KpiEntry[] = [
    { label: "Total orders", value: cellText(totals.total_orders as PdfCell) },
    { label: "Delivered", value: cellText(totals.delivered_orders as PdfCell) },
    { label: "Revenue", value: cellText(totals.revenue as PdfCell) },
    { label: "Avg delivery", value: cellText((data.average_times as Record<string, unknown>)?.avg_delivery_time as PdfCell) },
  ].filter((k) => k.value !== "—");

  if (kpis.length > 0) {
    const chipW = (W - 28) / kpis.length;
    kpis.forEach((kpi, i) => {
      const cx = 14 + i * chipW;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(cx, y, chipW - 4, 18, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cx, y, chipW - 4, 18, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...SLATE);
      doc.text(kpi.value, cx + (chipW - 4) / 2, y + 9, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(kpi.label, cx + (chipW - 4) / 2, y + 14.5, { align: "center" });
    });
    y += 24;
  }

  // ── Status donut + bar chart side-by-side ───────────────────────────────────
  const rawStatusCounts = (data.status_counts ?? {}) as Record<string, number>;
  const statusCounts = filterReportStatusCounts(rawStatusCounts, delivery);
  const statusColors = [
    "#7547CC", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
    "#64748b", "#a855f7", "#0ea5e9",
  ];
  const statusData: DonutDatum[] = Object.entries(statusCounts)
    .map(([label, value], i) => ({
      label,
      value: Number(value) || 0,
      color: statusColors[i % statusColors.length],
    }))
    .filter((d) => d.value > 0)
    .slice(0, 8);

  const orderTrends = (data.order_trends ?? {}) as Record<string, number>;
  const trendColors: Record<string, string> = {
    breakfast: "#06b6d4",
    lunch: "#7547CC",
    dinner: "#f59e0b",
    other: "#64748b",
  };
  const trendData: BarDatum[] = Object.entries(orderTrends)
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: Number(value) || 0,
      color: trendColors[label.toLowerCase()] ?? "#7547CC",
    }))
    .filter((d) => d.value > 0);

  const chartSectionH = 66;

  if (statusData.length > 0 || trendData.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text("Order status breakdown", 14, y + 5);

    if (statusData.length > 0) {
      const donut = makeDonutCanvas(statusData, 180);
      const donutImg = canvasToDataUrl(donut);
      doc.addImage(donutImg, "PNG", 14, y + 7, chartSectionH * 1.1, chartSectionH);
      y = addLegend(doc, statusData, 14, y + chartSectionH + 10);
    }
  }

  if (trendData.length > 0) {
    // place bar chart in the right half
    const barX = W / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);

    const barTopY = kpis.length > 0 ? 36 + 24 : 36;
    doc.text("Orders by meal period", barX, barTopY + 5);
    const bar = makeBarCanvas(trendData, 240, 80);
    const barImg = canvasToDataUrl(bar);
    doc.addImage(barImg, "PNG", barX, barTopY + 7, W / 2 - 14, 55);
  }

  // ── Summary KPI table ────────────────────────────────────────────────────────
  const summaryRows = [
    ...objectRows(data.totals, "Totals"),
    ...objectRows(data.delivered_totals, "Delivered"),
    ...objectRows(data.average_times, "Avg times"),
    ...objectRows(statusCounts, "Status counts"),
  ];

  if (summaryRows.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text("KPI Summary", 14, y + 5);
    autoTable(doc, {
      startY: y + 8,
      head: [["Metric", "Value"]],
      body: summaryRows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.4, overflow: "linebreak" },
      headStyles: { fillColor: [...ACCENT] as [number, number, number], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    });
    y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y + 30;
  }

  // ── Delivery partners table ─────────────────────────────────────────────────
  const partners = Array.isArray(data.delivery_partners)
    ? (data.delivery_partners as Array<Record<string, unknown>>)
    : [];
  const partnerKeys = Array.from(
    new Set(partners.flatMap((row) => Object.keys(row))),
  ).slice(0, 8);

  if (partners.length > 0 && partnerKeys.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text("Delivery partners", 14, y + 10);
    autoTable(doc, {
      startY: y + 13,
      head: [partnerKeys.map((k) => k.replace(/_/g, " "))],
      body: partners.map((row) =>
        partnerKeys.map((k) => cellText(row[k] as PdfCell)),
      ),
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [...ACCENT] as [number, number, number], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 18 },
    });
  }

  addPageFooter(doc);
  const blob = doc.output("blob");
  return blob.type === "application/pdf"
    ? blob
    : new Blob([blob], { type: "application/pdf" });
}

export function downloadShopAnalyticsPdf(
  data: Record<string, unknown>,
  shopName?: string,
  delivery?: ShopDeliverySettings | null,
) {
  const shopId = cellText(data.shop_id as PdfCell);
  const range = data.date_range as Record<string, unknown> | undefined;
  const dateLabel = range
    ? `${cellText((range.start ?? range.start_date) as PdfCell)} to ${cellText((range.end ?? range.end_date) as PdfCell)}`
    : "selected-range";
  const blob = buildShopAnalyticsPdf(data, shopName, delivery);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(`shop-${shopId}-analytics-${dateLabel}`) || "analytics"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type InvoicePdfInput = {
  invoice_id?: string | number;
  invoice_number?: string;
  shop_id?: string;
  shop_name?: string;
  shop?: {
    shop_id?: string;
    shop_name?: string;
    vat_enabled?: boolean;
    vat_rate?: string | number;
  };
  status?: string;
  document_type?: string;
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
  created_at?: string;
  subscription_id?: string | number;
};

function moneyAed(value: string | number | null | undefined) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(amount);
}

export function downloadInvoicePdf(invoice: InvoicePdfInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const invoiceNo = cellText(
    invoice.invoice_number ?? invoice.invoice_id ?? "invoice",
  );
  const shopName = cellText(
    invoice.shop?.shop_name ?? invoice.shop_name ?? invoice.shop_id,
  );
  const shopId = cellText(invoice.shop?.shop_id ?? invoice.shop_id);
  const period =
    invoice.billing_period_start && invoice.billing_period_end
      ? `${invoice.billing_period_start} → ${invoice.billing_period_end}`
      : cellText(invoice.billing_month);
  const status = String(invoice.status ?? "UNKNOWN").toUpperCase();

  doc.setFillColor(117, 71, 204);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Restaurant Superadmin", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("UAE ECOM · Subscription Invoice", 14, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(invoiceNo, pageWidth - 14, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(status, pageWidth - 14, 22, { align: "right" });

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill to", 14, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(shopName, 14, 46);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(`Shop ID: ${shopId}`, 14, 51);
  if (invoice.subscription_id != null) {
    doc.text(`Subscription: ${cellText(invoice.subscription_id)}`, 14, 56);
  }

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Invoice details", pageWidth - 14, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const details: Array<[string, string]> = [
    ["Document", cellText(invoice.document_type ?? "INVOICE")],
    ["Period", period],
    ["Due date", cellText(invoice.due_date)],
    ["Issued", cellText(invoice.created_at?.slice(0, 10))],
  ];
  let detailY = 46;
  for (const [label, value] of details) {
    doc.text(`${label}: ${value}`, pageWidth - 14, detailY, { align: "right" });
    detailY += 5;
  }

  autoTable(doc, {
    startY: 68,
    head: [["Description", "Amount"]],
    body: [
      [
        invoice.description?.trim() ||
          `Platform subscription · ${period}`,
        moneyAed(invoice.amount),
      ],
      ["Discount", moneyAed(invoice.discount)],
      ["Other charges", moneyAed(invoice.other_charges)],
      [
        invoice.shop?.vat_enabled
          ? `VAT (${cellText(invoice.shop.vat_rate)}%)`
          : "VAT",
        moneyAed(invoice.vat),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [117, 71, 204], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const afterTableY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 110;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth - 84, afterTableY + 6, 70, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Total due", pageWidth - 78, afterTableY + 13);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(moneyAed(invoice.total ?? invoice.amount), pageWidth - 20, afterTableY + 13, {
    align: "right",
  });

  let y = afterTableY + 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Payment", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  y += 6;
  doc.text(`Status: ${status}`, 14, y);
  y += 5;
  doc.text(`Paid at: ${cellText(invoice.paid_at)}`, 14, y);
  y += 5;
  doc.text(
    `Transaction reference: ${cellText(invoice.transaction_reference)}`,
    14,
    y,
  );

  addPageFooter(doc);
  doc.save(`${safeFilename(`invoice-${invoiceNo}`)}.pdf`);
}
