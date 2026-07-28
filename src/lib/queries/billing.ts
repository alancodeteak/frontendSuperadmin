import { queryOptions } from "@tanstack/react-query";

import { getInvoice, listInvoices } from "@/lib/api/billing";
import type { InvoiceStatus } from "@/types/api";

type InvoiceListParams = {
  shop_id?: string;
  status?: InvoiceStatus;
  billing_month?: string;
  page?: number;
  limit?: number;
};

export const billingKeys = {
  all: ["billing"] as const,
  invoices: (params: InvoiceListParams) =>
    [...billingKeys.all, "invoices", params] as const,
  invoice: (id: string | number) =>
    [...billingKeys.all, "invoice", String(id)] as const,
};

export function invoicesQuery(params: InvoiceListParams) {
  return queryOptions({
    queryKey: billingKeys.invoices(params),
    queryFn: () => listInvoices(params),
    staleTime: 30_000,
  });
}

export function invoiceQuery(id: string | number) {
  return queryOptions({
    queryKey: billingKeys.invoice(id),
    queryFn: () => getInvoice(id),
    enabled: Boolean(id),
  });
}
