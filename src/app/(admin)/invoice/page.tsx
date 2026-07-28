"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileDownIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  downloadInvoice,
  generateInvoices,
  invoiceBillingMonth,
  invoiceDisplayId,
  invoiceRouteId,
  invoiceShopLabel,
  markOverdueInvoices,
} from "@/lib/api/billing";
import { invoicesQuery } from "@/lib/queries/billing";
import { formatCurrency } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/api";

function money(value: string | number | undefined) {
  return formatCurrency(Number(value) || 0);
}

export default function InvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [shopId, setShopId] = useState("");
  const [status, setStatus] = useState(
    () => searchParams.get("status")?.toUpperCase() || "all",
  );
  const [billingMonth, setBillingMonth] = useState("");
  const [generateMonth, setGenerateMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const listQuery = useQuery(
    invoicesQuery({
      page: 1,
      limit: 50,
      shop_id: shopId || undefined,
      status: status === "all" ? undefined : (status as InvoiceStatus),
      billing_month: billingMonth || undefined,
    }),
  );
  const items = listQuery.data?.items ?? [];
  const loading = listQuery.isPending;
  const error = listQuery.error
    ? listQuery.error instanceof Error
      ? listQuery.error.message
      : "Failed to load invoices"
    : null;
  const load = () => void listQuery.refetch();

  async function onDownload(invoice: Invoice) {
    const id = invoiceRouteId(invoice);
    setDownloadingId(id);
    setMessage(null);
    try {
      await downloadInvoice(id);
      appToast.success(`Downloaded ${invoiceDisplayId(invoice)}.pdf`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Download failed";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  }

  const columns: ColumnDef<Invoice>[] = [
    {
      id: "invoice",
      accessorFn: (row) => invoiceDisplayId(row),
      header: "Invoice",
      cell: ({ row }) => (
        <span className="font-medium">{invoiceDisplayId(row.original)}</span>
      ),
      meta: { label: "Invoice" },
    },
    {
      id: "shop",
      accessorFn: (row) => invoiceShopLabel(row),
      header: "Shop",
      cell: ({ row }) => invoiceShopLabel(row.original),
      meta: { label: "Shop" },
    },
    {
      id: "month",
      accessorFn: (row) => invoiceBillingMonth(row),
      header: "Month",
      cell: ({ row }) => invoiceBillingMonth(row.original),
      meta: { label: "Month" },
    },
    {
      id: "total",
      accessorFn: (row) => Number(row.total ?? row.amount) || 0,
      header: "Total",
      cell: ({ row }) => money(row.original.total ?? row.original.amount),
      meta: { label: "Total" },
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => row.original.due_date ?? "—",
      meta: { label: "Due" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={String(row.original.status).toLowerCase()} />
      ),
      meta: { label: "Status" },
    },
    {
      id: "actions",
      header: () => <span className="block w-full text-right">Actions</span>,
      enableSorting: false,
      size: 112,
      cell: ({ row }) => {
        const id = invoiceRouteId(row.original);
        return (
          <div className="text-right">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={downloadingId === id}
              onClick={() => void onDownload(row.original)}
            >
              <FileDownIcon className="size-3.5" />
              {downloadingId === id ? "…" : "PDF"}
            </Button>
          </div>
        );
      },
      meta: { label: "Actions" },
    },
  ];

  return (
    <PageShell>
      <TopBarSlot>
        <Input
          className="h-8 w-40 max-w-[10rem]"
          placeholder="Shop ID"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          aria-label="Shop ID filter"
        />
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          className="h-8 w-40"
          value={billingMonth}
          onChange={(e) => setBillingMonth(e.target.value)}
          aria-label="Billing month"
        />
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
          Apply
        </Button>
      </TopBarSlot>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Generate for month</Label>
          <Input
            type="month"
            value={generateMonth}
            onChange={(e) => setGenerateMonth(e.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={async () => {
            setMessage(null);
            try {
              const res = await generateInvoices(generateMonth);
              appToast.success(
                `Generated ${res.created} invoice(s); skipped ${res.skipped} of ${res.eligible} eligible.`,
              );
              await load();
            } catch (err) {
              const msg =
                err instanceof ApiError ? err.message : "Generate failed";
              setMessage(msg);
              appToast.error(msg);
            }
          }}
        >
          Generate invoices
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            setMessage(null);
            try {
              const res = await markOverdueInvoices();
              appToast.success(`Marked ${res.updated} invoice(s) overdue.`);
              await load();
            } catch (err) {
              const msg =
                err instanceof ApiError ? err.message : "Mark overdue failed";
              setMessage(msg);
              appToast.error(msg);
            }
          }}
        >
          Mark overdue
        </Button>
      </div>

      {message ? (
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      ) : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No invoices"
          description="Generate invoices or adjust filters."
        />
      ) : null}

      {items.length > 0 ? (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Search invoices…"
          emptyMessage="No invoices match your search."
          initialPageSize={10}
          getRowId={(row) => invoiceRouteId(row)}
          rowClassName={(row) =>
            String(row.status).toUpperCase() === "OVERDUE"
              ? "bg-destructive/5 hover:bg-destructive/10"
              : undefined
          }
          onRowClick={(row) => router.push(`/invoice/${invoiceRouteId(row)}`)}
        />
      ) : null}
    </PageShell>
  );
}
