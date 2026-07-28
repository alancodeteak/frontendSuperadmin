"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDownIcon, PrinterIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState, LoadingState, StatusBadge } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  downloadInvoice,
  invoiceBillingMonth,
  invoiceDisplayId,
  invoiceShopLabel,
  isValidMoneyInput,
  patchInvoice,
  payInvoice,
  toMoneyString,
  voidInvoice,
} from "@/lib/api/billing";
import { billingKeys, invoiceQuery } from "@/lib/queries/billing";
import { cn, formatCurrency } from "@/lib/utils";

function money(value: string | number | undefined) {
  return formatCurrency(Number(value) || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function moneyFieldValue(value: string | number | null | undefined) {
  return toMoneyString(value) ?? "";
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [otherCharges, setOtherCharges] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    discount?: string;
    other_charges?: string;
    txn?: string;
  }>({});

  const detailQuery = useQuery(invoiceQuery(invoiceId));
  const invoice = detailQuery.data ?? null;
  const loading = detailQuery.isPending;
  const error = detailQuery.error
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : "Failed to load invoice"
    : null;

  async function refreshInvoice() {
    await queryClient.invalidateQueries({
      queryKey: billingKeys.invoice(invoiceId),
    });
    await queryClient.invalidateQueries({ queryKey: billingKeys.all });
    await detailQuery.refetch();
  }

  useEffect(() => {
    if (!invoice) return;
    setAmount(moneyFieldValue(invoice.amount));
    setDiscount(moneyFieldValue(invoice.discount));
    setOtherCharges(moneyFieldValue(invoice.other_charges));
  }, [
    invoice,
    invoice?.amount,
    invoice?.discount,
    invoice?.other_charges,
    invoice?.updated_at,
  ]);

  if (loading) {
    return (<PageShell>
          <LoadingState />
        </PageShell>);
  }

  if (error || !invoice) {
    return (<PageShell>
          <ErrorState
            message={error ?? "Not found"}
            onRetry={() => void refreshInvoice()}
          />
        </PageShell>);
  }

  const unpaid = ["PENDING", "ISSUED", "OVERDUE"].includes(
    String(invoice.status).toUpperCase(),
  );
  const displayId = invoiceDisplayId(invoice);
  const shopName = invoiceShopLabel(invoice);
  const period =
    invoice.billing_period_start && invoice.billing_period_end
      ? `${invoice.billing_period_start} → ${invoice.billing_period_end}`
      : invoiceBillingMonth(invoice);
  const vatLabel = invoice.shop?.vat_enabled
    ? `VAT (${invoice.shop.vat_rate ?? "—"}%)`
    : "VAT";
  const patchId = String(invoice.invoice_id ?? invoice.id ?? invoiceId);

  async function onDownload() {
    if (!invoice) return;
    setDownloading(true);
    setMessage(null);
    try {
      await downloadInvoice(invoice);
      setMessageTone("ok");
      setMessage("Invoice PDF downloaded.");
      appToast.success("Invoice PDF downloaded.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Download failed";
      setMessageTone("error");
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setDownloading(false);
    }
  }

  async function onSaveAdjustments(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    if (!isValidMoneyInput(amount)) {
      errors.amount = "Use a non-negative amount like 1200.00";
    }
    if (!isValidMoneyInput(discount)) {
      errors.discount = "Use a non-negative amount like 15.00";
    }
    if (!isValidMoneyInput(otherCharges)) {
      errors.other_charges = "Use a non-negative amount like 5.00";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessageTone("error");
      setMessage("Fix money fields before saving.");
      return;
    }

    const payload = {
      amount: amount.trim() ? amount : undefined,
      discount: discount.trim() ? discount : undefined,
      other_charges: otherCharges.trim() ? otherCharges : undefined,
    };
    if (!payload.amount && !payload.discount && !payload.other_charges) {
      setMessageTone("error");
      setMessage("Enter at least one of amount, discount, or other charges.");
      return;
    }

    setSaving(true);
    try {
      await patchInvoice(patchId, payload);
      setMessageTone("ok");
      setMessage("Invoice updated.");
      appToast.success("Invoice updated.");
      await refreshInvoice();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Update failed";
      setMessageTone("error");
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});
    const ref = txnRef.trim();
    if (!ref) {
      setFieldErrors({ txn: "Transaction reference is required" });
      return;
    }
    setPaying(true);
    try {
      await payInvoice(patchId, { transaction_reference: ref });
      setMessageTone("ok");
      setMessage("Invoice marked paid.");
      appToast.success("Invoice marked paid.");
      setTxnRef("");
      await refreshInvoice();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Pay failed";
      setMessageTone("error");
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  return (<PageShell>
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <StatusBadge status={String(invoice.status).toLowerCase()} />
          <Button variant="outline" size="sm" render={<Link href="/invoice" />}>
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={downloading}
            onClick={() => void onDownload()}
          >
            <FileDownIcon className="size-3.5" />
            {downloading ? "Downloading…" : "Download PDF"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.print()}
          >
            <PrinterIcon className="size-3.5" />
            Print
          </Button>
        </div>

        {message ? (
          <p
            className={cn(
              "mb-4 text-sm print:hidden",
              messageTone === "error" ? "text-destructive" : "text-emerald-700",
            )}
          >
            {message}
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-primary px-6 py-5 text-primary-foreground">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase opacity-80">
                  UAE ECOM
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Restaurant Superadmin
                </h2>
                <p className="mt-1 text-sm opacity-90">
                  Subscription {invoice.document_type ?? "invoice"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase opacity-80">Invoice</p>
                <p className="mt-1 text-xl font-semibold">{displayId}</p>
                <p className="mt-2 inline-flex rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">
                  {String(invoice.status).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="grid gap-6 border-b px-6 py-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Bill to
                </p>
                <p className="mt-2 text-lg font-semibold">{shopName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Shop ID: {invoice.shop?.shop_id ?? invoice.shop_id ?? "—"}
                </p>
                {invoice.subscription_id != null ? (
                  <p className="text-sm text-muted-foreground">
                    Subscription: {invoice.subscription_id}
                  </p>
                ) : null}
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Details
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-6 sm:justify-end">
                    <dt className="text-muted-foreground">Billing period</dt>
                    <dd className="font-medium">{period}</dd>
                  </div>
                  <div className="flex justify-between gap-6 sm:justify-end">
                    <dt className="text-muted-foreground">Due date</dt>
                    <dd className="font-medium">{invoice.due_date ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-6 sm:justify-end">
                    <dt className="text-muted-foreground">Issued</dt>
                    <dd className="font-medium">
                      {invoice.created_at?.slice(0, 10) ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6 sm:justify-end">
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd className="font-medium">
                      {invoice.updated_at?.slice(0, 10) ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="mb-3 text-sm text-muted-foreground">
                {invoice.description?.trim() ||
                  `Platform subscription charges for ${period}.`}
              </p>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-3">Subscription amount</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(invoice.amount)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3">Discount</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(invoice.discount)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3">Other charges</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(invoice.other_charges)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3">{vatLabel}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(invoice.vat)}
                      </td>
                    </tr>
                    <tr className="border-t bg-muted/40">
                      <td className="px-4 py-3 font-semibold">Total due</td>
                      <td className="px-4 py-3 text-right text-base font-semibold tabular-nums">
                        {money(invoice.total ?? invoice.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 border-t px-6 py-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Payment
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">
                      {String(invoice.status).toUpperCase()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Paid at</dt>
                    <dd>{formatDateTime(invoice.paid_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Txn reference</dt>
                    <dd className="break-all">
                      {invoice.transaction_reference ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Shop VAT
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">VAT enabled</dt>
                    <dd>
                      {invoice.shop?.vat_enabled == null
                        ? "—"
                        : invoice.shop.vat_enabled
                          ? "Yes"
                          : "No"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">VAT rate</dt>
                    <dd>
                      {invoice.shop?.vat_rate != null
                        ? `${invoice.shop.vat_rate}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>

          <section className="h-fit space-y-4 rounded-xl border bg-card p-5 print:hidden">
            {unpaid ? (
              <>
                <form
                  className="space-y-3"
                  onSubmit={(e) => void onSaveAdjustments(e)}
                >
                  <h3 className="font-semibold">Adjust unpaid invoice</h3>
                  <p className="text-xs text-muted-foreground">
                    Money fields must be decimal strings (e.g. 15.00). Only
                    PENDING / ISSUED / OVERDUE.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="inv-amount">Amount</Label>
                    <Input
                      id="inv-amount"
                      inputMode="decimal"
                      value={amount}
                      aria-invalid={Boolean(fieldErrors.amount)}
                      className={cn(fieldErrors.amount && "border-destructive")}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1200.00"
                    />
                    {fieldErrors.amount ? (
                      <p className="text-xs text-destructive">
                        {fieldErrors.amount}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-discount">Discount</Label>
                    <Input
                      id="inv-discount"
                      inputMode="decimal"
                      value={discount}
                      aria-invalid={Boolean(fieldErrors.discount)}
                      className={cn(
                        fieldErrors.discount && "border-destructive",
                      )}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="15.00"
                    />
                    {fieldErrors.discount ? (
                      <p className="text-xs text-destructive">
                        {fieldErrors.discount}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-other">Other charges</Label>
                    <Input
                      id="inv-other"
                      inputMode="decimal"
                      value={otherCharges}
                      aria-invalid={Boolean(fieldErrors.other_charges)}
                      className={cn(
                        fieldErrors.other_charges && "border-destructive",
                      )}
                      onChange={(e) => setOtherCharges(e.target.value)}
                      placeholder="5.00"
                    />
                    {fieldErrors.other_charges ? (
                      <p className="text-xs text-destructive">
                        {fieldErrors.other_charges}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save adjustments"}
                  </Button>
                </form>

                <form
                  className="space-y-3 border-t pt-4"
                  onSubmit={(e) => void onPay(e)}
                >
                  <h3 className="font-semibold">Mark paid</h3>
                  <div className="space-y-2">
                    <Label htmlFor="inv-txn">Transaction reference</Label>
                    <Input
                      id="inv-txn"
                      required
                      value={txnRef}
                      aria-invalid={Boolean(fieldErrors.txn)}
                      className={cn(fieldErrors.txn && "border-destructive")}
                      onChange={(e) => setTxnRef(e.target.value)}
                      placeholder="TXN-PM-20260715"
                    />
                    {fieldErrors.txn ? (
                      <p className="text-xs text-destructive">{fieldErrors.txn}</p>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={paying}>
                    {paying ? "Paying…" : "Pay invoice"}
                  </Button>
                </form>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm("Void this invoice?")) return;
                    setMessage(null);
                    try {
                      await voidInvoice(patchId);
                      setMessageTone("ok");
                      setMessage("Invoice voided.");
                      appToast.success("Invoice voided.");
                      await refreshInvoice();
                    } catch (err) {
                      const msg =
                        err instanceof ApiError ? err.message : "Void failed";
                      setMessageTone("error");
                      setMessage(msg);
                      appToast.error(msg);
                    }
                  }}
                >
                  Void invoice
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This invoice is {String(invoice.status).toLowerCase()} and cannot
                be adjusted.
              </p>
            )}
          </section>
        </div>
      </PageShell>);
}
