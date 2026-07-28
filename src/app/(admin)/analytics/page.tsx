"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EyeIcon, FileDownIcon } from "lucide-react";

import { TicketDetailDialog } from "@/components/analytics/ticket-detail-dialog";
import { TicketImagesCell } from "@/components/analytics/ticket-images";
import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import {
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type ColumnDef,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  analyticsCustomersQuery,
  analyticsRestaurantsQuery,
  analyticsSubscriptionsQuery,
  analyticsTicketsQuery,
} from "@/lib/queries/analytics";
import { downloadTablePdf } from "@/lib/pdf";
import { formatCurrency } from "@/lib/utils";
import type {
  AnalyticsCustomerRow,
  AnalyticsTicket,
  Invoice,
  RestaurantPerformanceRow,
} from "@/types/api";

type Tab = "restaurants" | "tickets" | "customers" | "subscriptions";

function formatTicketListDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AE", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createTicketColumns(
  onViewTicket: (ticket: AnalyticsTicket) => void,
): ColumnDef<AnalyticsTicket>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      meta: { label: "ID" },
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            onViewTicket(row.original);
          }}
        >
          #{row.original.id}
        </button>
      ),
    },
    {
      id: "user",
      accessorFn: (row) => `${row.user_id ?? ""} ${row.user_role ?? ""}`,
      header: "User",
      meta: { label: "User" },
      cell: ({ row }) => (
        <>
          {row.original.user_id}
          <p className="text-xs text-muted-foreground">
            {row.original.user_role}
          </p>
        </>
      ),
    },
    {
      accessorKey: "shop_id",
      header: "Shop",
      meta: { label: "Shop" },
      cell: ({ row }) =>
        row.original.shop_id ? (
          <Link
            href={`/shops/${encodeURIComponent(String(row.original.shop_id))}`}
            className="font-mono text-xs hover:text-primary"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.shop_id}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "order_id",
      header: "Order",
      meta: { label: "Order" },
      cell: ({ row }) => row.original.order_id ?? "—",
    },
    {
      accessorKey: "reason",
      header: "Reason",
      meta: { label: "Reason" },
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-[16rem]">
          {row.original.reason ?? "—"}
        </span>
      ),
    },
    {
      id: "images",
      accessorFn: (row) =>
        Array.isArray(row.images) ? row.images.join(" ") : "",
      header: "Images",
      meta: { label: "Images" },
      size: 148,
      cell: ({ row }) => <TicketImagesCell ticket={row.original} />,
    },
    {
      accessorKey: "created_at",
      header: "Opened",
      meta: { label: "Opened" },
      cell: ({ row }) => formatTicketListDate(row.original.created_at),
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      size: 72,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={(event) => {
            event.stopPropagation();
            onViewTicket(row.original);
          }}
        >
          <EyeIcon className="size-3.5" />
          View
        </Button>
      ),
    },
  ];
}

const restaurantColumns: ColumnDef<RestaurantPerformanceRow>[] = [
  {
    id: "shop",
    accessorKey: "shop_name",
    header: "Shop",
    meta: { label: "Shop" },
    cell: ({ row }) => (
      <>
        <Link
          href={`/shops/${row.original.shop_id}`}
          className="font-medium hover:text-primary"
        >
          {row.original.shop_name}
        </Link>
        <p className="text-xs text-muted-foreground">{row.original.shop_id}</p>
      </>
    ),
  },
  {
    accessorKey: "delivered_orders",
    header: "Orders",
    meta: { label: "Orders" },
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    meta: { label: "Revenue" },
    cell: ({ row }) => formatCurrency(Number(row.original.revenue) || 0),
  },
  {
    id: "on_time",
    accessorKey: "on_time_percent",
    header: "On-time",
    meta: { label: "On-time" },
    cell: ({ row }) =>
      `${row.original.on_time_percent.toFixed(1)}% (${row.original.on_time_deliveries})`,
  },
];

const customerColumns: ColumnDef<AnalyticsCustomerRow>[] = [
  {
    id: "shop",
    accessorKey: "shop_name",
    header: "Shop",
    meta: { label: "Shop" },
    cell: ({ row }) => (
      <Link
        href={`/shops/${row.original.shop_id}`}
        className="font-medium hover:text-primary"
      >
        {row.original.shop_name}
      </Link>
    ),
  },
  {
    accessorKey: "customers",
    header: "Customers",
    meta: { label: "Customers" },
    cell: ({ row }) => row.original.customers ?? 0,
  },
  {
    accessorKey: "active_customers",
    header: "Active",
    meta: { label: "Active" },
    cell: ({ row }) => row.original.active_customers ?? 0,
  },
  {
    accessorKey: "total_orders",
    header: "Orders",
    meta: { label: "Orders" },
    cell: ({ row }) => row.original.total_orders ?? 0,
  },
];

const subscriptionColumns: ColumnDef<Invoice>[] = [
  {
    id: "invoice",
    accessorFn: (row) => String(row.invoice_id ?? row.id ?? ""),
    header: "Invoice",
    meta: { label: "Invoice" },
    cell: ({ row }) => {
      const id = String(row.original.invoice_id ?? row.original.id);
      return (
        <Link
          href={`/invoice/${id}`}
          className="font-medium hover:text-primary"
        >
          {id}
        </Link>
      );
    },
  },
  {
    id: "shop",
    accessorFn: (row) => String(row.shop_name ?? row.shop_id ?? ""),
    header: "Shop",
    meta: { label: "Shop" },
    cell: ({ row }) => row.original.shop_name ?? row.original.shop_id ?? "—",
  },
  {
    accessorKey: "billing_month",
    header: "Month",
    meta: { label: "Month" },
    cell: ({ row }) => row.original.billing_month ?? "—",
  },
  {
    id: "total",
    accessorFn: (row) => Number(row.total ?? row.amount) || 0,
    header: "Total",
    meta: { label: "Total" },
    cell: ({ row }) =>
      formatCurrency(Number(row.original.total ?? row.original.amount) || 0),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge status={String(row.original.status).toLowerCase()} />
    ),
  },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("restaurants");
  const [selectedTicket, setSelectedTicket] = useState<AnalyticsTicket | null>(
    null,
  );
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false);
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [sortBy, setSortBy] = useState<
    "revenue" | "delivered_orders" | "on_time_percent"
  >("revenue");
  const [ticketStatus, setTicketStatus] = useState("all");
  const [billingMonth, setBillingMonth] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleOpenTicketDetail = useCallback((ticket: AnalyticsTicket) => {
    setSelectedTicket(ticket);
    setTicketDetailOpen(true);
  }, []);

  const ticketColumns = useMemo(
    () => createTicketColumns(handleOpenTicketDetail),
    [handleOpenTicketDetail],
  );

  const restaurantsQuery = useQuery({
    ...analyticsRestaurantsQuery({
      page: 1,
      limit: 50,
      range,
      sort_by: sortBy,
      sort_dir: "desc",
    }),
    enabled: tab === "restaurants",
  });
  const ticketsQuery = useQuery({
    ...analyticsTicketsQuery({
      page: 1,
      limit: 50,
      status: ticketStatus === "all" ? undefined : ticketStatus,
    }),
    enabled: tab === "tickets",
  });
  const customersQuery = useQuery({
    ...analyticsCustomersQuery({ page: 1, limit: 50 }),
    enabled: tab === "customers",
  });
  const subscriptionsQuery = useQuery({
    ...analyticsSubscriptionsQuery({
      page: 1,
      limit: 50,
      billing_month: billingMonth || undefined,
    }),
    enabled: tab === "subscriptions",
  });

  const activeQuery =
    tab === "restaurants"
      ? restaurantsQuery
      : tab === "tickets"
        ? ticketsQuery
        : tab === "customers"
          ? customersQuery
          : subscriptionsQuery;

  const restaurants = restaurantsQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const customers = customersQuery.data?.items ?? [];
  const subscriptions = subscriptionsQuery.data?.items ?? [];
  const loading = activeQuery.isPending;
  const error = activeQuery.error
    ? activeQuery.error instanceof Error
      ? activeQuery.error.message
      : "Failed to load analytics"
    : null;
  const load = () => void activeQuery.refetch();

  function downloadCurrentTabPdf() {
    setPdfGenerating(true);
    try {
      const generated = new Date().toLocaleString("en-AE");

      if (tab === "restaurants") {
        downloadTablePdf({
          title: "Restaurant Performance Analytics",
          subtitle: `Range: ${range} · Sorted by ${sortBy.replace(/_/g, " ")}`,
          filename: `analytics-restaurants-${range}`,
          columns: ["Shop", "Shop ID", "Orders", "Revenue", "On-time"],
          rows: restaurants.map((row) => [
            row.shop_name,
            row.shop_id,
            row.delivered_orders,
            formatCurrency(Number(row.revenue) || 0),
            `${row.on_time_percent.toFixed(1)}% (${row.on_time_deliveries})`,
          ]),
          metadata: [
            ["Records", restaurants.length],
            ["Generated", generated],
          ],
        });
        return;
      }

      if (tab === "tickets") {
        downloadTablePdf({
          title: "Support Ticket Analytics",
          subtitle:
            ticketStatus === "all"
              ? "All active tickets"
              : `Status: ${ticketStatus}`,
          filename: `analytics-tickets-${ticketStatus}`,
          columns: ["ID", "User", "Role", "Shop", "Order", "Reason", "Status", "Opened"],
          rows: tickets.map((row) => [
            row.id,
            row.user_id,
            row.user_role,
            row.shop_id,
            row.order_id,
            row.reason,
            row.status,
            formatTicketListDate(row.created_at),
          ]),
          metadata: [
            ["Records", tickets.length],
            ["Generated", generated],
          ],
        });
        return;
      }

      if (tab === "customers") {
        downloadTablePdf({
          title: "Customer Analytics",
          filename: "analytics-customers",
          columns: ["Shop", "Shop ID", "Customers", "Active", "Orders"],
          rows: customers.map((row) => [
            row.shop_name,
            row.shop_id,
            row.customers ?? 0,
            row.active_customers ?? 0,
            row.total_orders ?? 0,
          ]),
          metadata: [
            ["Records", customers.length],
            ["Generated", generated],
          ],
        });
        return;
      }

      downloadTablePdf({
        title: "Subscription Analytics",
        subtitle: billingMonth
          ? `Billing month: ${billingMonth}`
          : "All billing months",
        filename: `analytics-subscriptions-${billingMonth || "all"}`,
        columns: ["Invoice", "Shop", "Month", "Total", "Status"],
        rows: subscriptions.map((row) => [
          String(row.invoice_id ?? row.id),
          row.shop_name ?? row.shop_id,
          row.billing_month,
          formatCurrency(Number(row.total ?? row.amount) || 0),
          row.status,
        ]),
        metadata: [
          ["Records", subscriptions.length],
          ["Generated", generated],
        ],
      });
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <PageShell>
      <TopBarSlot>
        {tab === "restaurants" ? (
          <>
            <Select
              value={range}
              onValueChange={(v) => setRange((v as typeof range) ?? "week")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy((v as typeof sortBy) ?? "revenue")
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort: revenue</SelectItem>
                <SelectItem value="delivered_orders">Sort: orders</SelectItem>
                <SelectItem value="on_time_percent">Sort: on-time %</SelectItem>
              </SelectContent>
            </Select>
          </>
        ) : null}
        {tab === "tickets" ? (
          <Select
            value={ticketStatus}
            onValueChange={(v) => setTicketStatus(v ?? "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All active</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {tab === "subscriptions" ? (
          <Input
            type="month"
            className="h-8 w-44"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            placeholder="Billing month"
            aria-label="Billing month"
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
        >
          Refresh
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={loading || pdfGenerating}
          onClick={downloadCurrentTabPdf}
        >
          <FileDownIcon className="size-4" />
          {pdfGenerating ? "Generating…" : "Download PDF"}
        </Button>
      </TopBarSlot>

      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {(
          [
            ["restaurants", "Restaurants"],
            ["tickets", "Tickets"],
            ["customers", "Customers"],
            ["subscriptions", "Subscriptions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-sm ${
              tab === id
                ? "border-b-2 border-primary font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && tab === "restaurants" ? (
        <DataTable
          columns={restaurantColumns}
          data={restaurants}
          getRowId={(row, index) => `${row.shop_id}-${index}`}
          searchPlaceholder="Search shops, orders, revenue…"
          emptyMessage="No restaurant data"
          initialPageSize={25}
        />
      ) : null}

      {!loading && !error && tab === "tickets" ? (
        <DataTable
          columns={ticketColumns}
          data={tickets}
          getRowId={(row, index) => `${row.id}-${index}`}
          searchPlaceholder="Search tickets by ID, user, shop, order…"
          emptyMessage="No tickets"
          initialPageSize={25}
          onRowClick={handleOpenTicketDetail}
        />
      ) : null}

      <TicketDetailDialog
        ticket={selectedTicket}
        open={ticketDetailOpen}
        onOpenChange={setTicketDetailOpen}
      />

      {!loading && !error && tab === "customers" ? (
        <DataTable
          columns={customerColumns}
          data={customers}
          getRowId={(row, index) => `${row.shop_id ?? "row"}-${index}`}
          searchPlaceholder="Search shops or customer counts…"
          emptyMessage="No customer stats"
          initialPageSize={25}
        />
      ) : null}

      {!loading && !error && tab === "subscriptions" ? (
        <DataTable
          columns={subscriptionColumns}
          data={subscriptions}
          getRowId={(row, index) =>
            `${row.invoice_id ?? row.id ?? "row"}-${index}`
          }
          searchPlaceholder="Search invoices, shops, months…"
          emptyMessage="No subscription invoices"
          initialPageSize={25}
        />
      ) : null}
    </PageShell>
  );
}
