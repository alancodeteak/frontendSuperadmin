import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockGenerateInvoices,
  mockGetInvoice,
  mockListInvoices,
  mockMarkOverdue,
  mockPatchInvoice,
  mockPayInvoice,
  mockVoidInvoice,
} from "@/lib/mock-data";
import { downloadInvoicePdf } from "@/lib/pdf";
import type { Invoice, InvoiceStatus, Paginated } from "@/types/api";

/** Admin-api money fields are decimal strings (e.g. "15.00"). */
export function toMoneyString(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export function isValidMoneyInput(value: string) {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return true;
  return /^\d+(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) >= 0;
}

/** ISO-8601 timestamp with Asia/Dubai (+04:00) offset for payInvoice. */
export function dubaiPaidAt(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+04:00`;
}

export function invoiceDisplayId(invoice: Invoice) {
  return String(invoice.invoice_number ?? invoice.invoice_id ?? invoice.id ?? "");
}

export function invoiceRouteId(invoice: Invoice) {
  return String(invoice.invoice_id ?? invoice.id ?? "");
}

export function invoiceBillingMonth(invoice: Invoice) {
  if (invoice.billing_month) return invoice.billing_month;
  if (invoice.billing_period_start) {
    return invoice.billing_period_start.slice(0, 7);
  }
  return "—";
}

export function invoiceShopLabel(invoice: Invoice) {
  return (
    invoice.shop?.shop_name ??
    invoice.shop_name ??
    invoice.shop_id ??
    "—"
  );
}

export function listInvoices(params?: {
  shop_id?: string;
  status?: InvoiceStatus;
  billing_month?: string;
  page?: number;
  limit?: number;
}) {
  if (isDevelopmentMode()) return mockListInvoices(params);
  return apiFetch<Paginated<Invoice>>("/v2/billing/invoices", { params });
}

export function getInvoice(invoiceId: string | number) {
  if (isDevelopmentMode()) return mockGetInvoice(invoiceId);
  return apiFetch<Invoice>(`/v2/billing/invoices/${invoiceId}`);
}

export function generateInvoices(billing_month: string) {
  if (isDevelopmentMode()) return mockGenerateInvoices(billing_month);
  return apiFetch<{
    billing_month: string;
    created: number;
    skipped: number;
    eligible: number;
  }>("/v2/billing/invoices/generate", {
    method: "POST",
    body: JSON.stringify({ billing_month }),
  });
}

export function markOverdueInvoices() {
  if (isDevelopmentMode()) return mockMarkOverdue();
  return apiFetch<{ updated: number; as_of: string }>(
    "/v2/billing/invoices/mark-overdue",
    { method: "POST" },
  );
}

export type PatchInvoiceInput = {
  amount?: string | number | null;
  discount?: string | number | null;
  other_charges?: string | number | null;
};

export function patchInvoice(
  invoiceId: string | number,
  input: PatchInvoiceInput,
) {
  const body: Record<string, string> = {};
  const amount = toMoneyString(input.amount);
  const discount = toMoneyString(input.discount);
  const otherCharges = toMoneyString(input.other_charges);

  if (amount != null) body.amount = amount;
  if (discount != null) body.discount = discount;
  if (otherCharges != null) body.other_charges = otherCharges;

  if (Object.keys(body).length === 0) {
    return Promise.reject(
      new Error(
        "Provide at least one of amount, discount, or other_charges (e.g. 15.00)",
      ),
    );
  }

  if (isDevelopmentMode()) return mockPatchInvoice(invoiceId, body);
  return apiFetch<Invoice>(`/v2/billing/invoices/${invoiceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function payInvoice(
  invoiceId: string | number,
  input: { transaction_reference: string; paid_at?: string },
) {
  const payload = {
    transaction_reference: input.transaction_reference.trim(),
    paid_at: input.paid_at ?? dubaiPaidAt(),
  };
  if (isDevelopmentMode()) return mockPayInvoice(invoiceId, payload);
  return apiFetch<Invoice>(`/v2/billing/invoices/${invoiceId}/pay`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function voidInvoice(invoiceId: string | number) {
  if (isDevelopmentMode()) return mockVoidInvoice(invoiceId);
  return apiFetch<Invoice>(`/v2/billing/invoices/${invoiceId}/void`, {
    method: "POST",
  });
}

/**
 * Prefer stored `pdf_url` when present; otherwise generate a client-side PDF
 * from the invoice payload (admin-api does not expose a PDF binary endpoint).
 */
export async function downloadInvoice(invoiceOrId: Invoice | string | number) {
  const invoice =
    typeof invoiceOrId === "object"
      ? invoiceOrId
      : await getInvoice(invoiceOrId);

  const pdfUrl =
    typeof invoice.pdf_url === "string" ? invoice.pdf_url.trim() : "";
  if (pdfUrl) {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `${invoiceDisplayId(invoice) || "invoice"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { source: "url" as const, invoice };
  }

  downloadInvoicePdf(invoice);
  return { source: "generated" as const, invoice };
}
