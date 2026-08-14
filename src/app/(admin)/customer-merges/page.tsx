"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  customerMergesListQuery,
} from "@/lib/queries/customer-merges";
import type { CustomerMergeRequest, CustomerMergeStatus } from "@/types/api";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function profileLabel(profile: CustomerMergeRequest["source"]) {
  if (!profile) return "—";
  return profile.customerName?.trim() || `Profile #${profile.id}`;
}

const mergeColumns: ColumnDef<CustomerMergeRequest>[] = [
  {
    accessorKey: "request_id",
    header: "Request",
    cell: ({ row }) => (
      <Link
        href={`/customer-merges/${row.original.request_id}`}
        className="font-mono text-xs text-primary hover:underline"
      >
        {row.original.request_id.slice(0, 8)}…
      </Link>
    ),
    meta: { label: "Request" },
    size: 120,
  },
  {
    accessorKey: "shop_id",
    header: "Shop",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.shop_id}</span>
    ),
    meta: { label: "Shop" },
    size: 100,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => profileLabel(row.original.source),
    meta: { label: "Source" },
    size: 160,
  },
  {
    accessorKey: "target",
    header: "Target",
    cell: ({ row }) => profileLabel(row.original.target),
    meta: { label: "Target" },
    size: 160,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { label: "Status" },
    size: 120,
  },
  {
    accessorKey: "created_at",
    header: "Requested",
    cell: ({ row }) => formatDate(row.original.created_at),
    meta: { label: "Requested" },
    size: 160,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="outline" size="sm" render={<Link href={`/customer-merges/${row.original.request_id}`} />}>
        Review
      </Button>
    ),
    meta: { label: "Actions" },
    size: 100,
  },
];

export default function CustomerMergesPage() {
  const [status, setStatus] = useState<CustomerMergeStatus | "all">("pending");
  const [page, setPage] = useState(1);

  const query = useQuery(
    customerMergesListQuery({
      status: status === "all" ? undefined : status,
      page,
      limit: 50,
    }),
  );

  return (
    <PageShell>
      <TopBarSlot>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as CustomerMergeStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="conflicted">Conflicted</SelectItem>
          </SelectContent>
        </Select>
      </TopBarSlot>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Customer merges</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review shop-initiated duplicate customer profile merge requests.
        </p>
      </div>

      {query.isLoading ? <LoadingState label="Loading merge requests…" /> : null}
      {query.isError ? (
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : "Could not load merge requests"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && query.data.items.length === 0 ? (
        <EmptyState
          title="No merge requests"
          description={
            status === "pending"
              ? "There are no pending customer merge requests."
              : "No requests match the selected filter."
          }
        />
      ) : null}

      {query.isSuccess && query.data.items.length > 0 ? (
        <>
          <DataTable columns={mergeColumns} data={query.data.items} />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {query.data.page} · {query.data.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.items.length < query.data.limit}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
