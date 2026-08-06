"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, RotateCcwIcon } from "lucide-react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Search } from "@/components/animate-ui/icons/search";
import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { CopyButton } from "@/components/shared/copy-button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseApiFormError } from "@/lib/api-form-error";
import { restoreGroup } from "@/lib/api/groups";
import { appToast } from "@/lib/app-toast";
import { groupKeys, groupsListQuery } from "@/lib/queries/groups";
import type { GroupSummary } from "@/types/api";

function CopyableValue({
  value,
  mono = false,
}: {
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={mono ? "truncate font-mono text-xs" : "truncate"}>
        {value}
      </span>
      <CopyButton
        value={value}
        iconOnly
        size={13}
        label={`Copy ${value}`}
        className="size-6 shrink-0 p-0"
      />
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

const groupColumns: ColumnDef<GroupSummary>[] = [
  {
    accessorKey: "name",
    header: "Group",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.name}</p>
        {row.original.slug ? (
          <p className="truncate font-mono text-xs text-muted-foreground">
            {row.original.slug}
          </p>
        ) : null}
      </div>
    ),
    meta: { label: "Group" },
    size: 220,
  },
  {
    accessorKey: "user_id",
    header: "User ID",
    cell: ({ row }) => (
      <CopyableValue value={String(row.original.user_id)} mono />
    ),
    meta: { label: "User ID" },
    size: 120,
  },
  {
    accessorKey: "shops_count",
    header: "Shops",
    cell: ({ row }) => row.original.shops_count,
    meta: { label: "Shops" },
    size: 80,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) =>
      row.original.email ? (
        <CopyableValue value={row.original.email} />
      ) : (
        "—"
      ),
    meta: { label: "Email" },
    size: 200,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) =>
      row.original.phone ? (
        <CopyableValue value={row.original.phone} />
      ) : (
        "—"
      ),
    meta: { label: "Phone" },
    size: 140,
  },
  {
    id: "status",
    accessorFn: (row) => row.status,
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={row.original.status} />
        {row.original.is_blocked ? <StatusBadge status="blocked" /> : null}
      </div>
    ),
    meta: { label: "Status" },
    size: 140,
  },
  {
    accessorKey: "last_login_at",
    header: "Last login",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.last_login_at)}
      </span>
    ),
    meta: { label: "Last login" },
    size: 180,
  },
];

type GroupListFilter = "all" | "active" | "inactive" | "suspended" | "blocked";

export default function GroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<GroupListFilter>("all");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreGroupId, setRestoreGroupId] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const groupsQuery = useQuery(
    groupsListQuery({
      page,
      page_size: 20,
      q: q || undefined,
      status: filter === "all" ? undefined : filter,
    }),
  );

  const items = groupsQuery.data?.items ?? [];
  const total = groupsQuery.data?.total;
  const loading = groupsQuery.isPending;
  const error = groupsQuery.error
    ? groupsQuery.error instanceof Error
      ? groupsQuery.error.message
      : "Failed to load groups"
    : null;

  function openRestore() {
    setRestoreError(null);
    setRestoreGroupId("");
    setRestoreBusy(false);
    setRestoreOpen(true);
  }

  async function runRestore() {
    const id = Number(restoreGroupId.trim());
    if (!Number.isInteger(id) || id <= 0) {
      setRestoreError("Enter a valid numeric group ID.");
      return;
    }
    setRestoreBusy(true);
    setRestoreError(null);
    try {
      const group = await restoreGroup(id);
      await queryClient.invalidateQueries({ queryKey: groupKeys.all });
      appToast.success(
        `Group “${group.name}” restored. Re-assign shops if needed.`,
      );
      setRestoreOpen(false);
      router.push(`/groups/${group.group_id}`);
    } catch (err) {
      const message = parseApiFormError(err, "Restore failed").message;
      setRestoreError(message);
      appToast.error(message);
    } finally {
      setRestoreBusy(false);
    }
  }

  return (
    <PageShell>
      <TopBarSlot>
        <AnimateIcon
          animateOnHover
          className="relative block w-full max-w-sm min-w-0"
        >
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-8 pl-9"
            placeholder="Search groups…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </AnimateIcon>
        <Select
          value={filter}
          onValueChange={(value) => {
            setPage(1);
            setFilter((value as GroupListFilter) ?? "all");
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={openRestore}>
          <RotateCcwIcon className="size-4" />
          Restore
        </Button>
        <Button
          size="sm"
          className="ml-auto shrink-0"
          render={<Link href="/groups/new" />}
        >
          <PlusIcon className="size-4" />
          Create group
        </Button>
      </TopBarSlot>

      {loading ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void groupsQuery.refetch()}
        />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No groups found"
          description="Create a group admin account, then assign shops."
          action={
            <Button render={<Link href="/groups/new" />}>Create group</Button>
          }
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <DataTable
          columns={groupColumns}
          data={items}
          hideSearch
          emptyMessage="No groups match this filter."
          getRowId={(row) => String(row.group_id)}
          onRowClick={(group) => router.push(`/groups/${group.group_id}`)}
          serverPagination={{
            pageIndex: page - 1,
            pageSize: 20,
            total,
            hasNextPage: groupsQuery.data?.has_next_page ?? items.length >= 20,
            onPageChange: (pageIndex) => setPage(pageIndex + 1),
          }}
        />
      ) : null}

      <Dialog
        open={restoreOpen}
        onOpenChange={(open) => {
          if (!open && restoreBusy) return;
          setRestoreOpen(open);
          if (!open) {
            setRestoreError(null);
            setRestoreGroupId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore a soft-deleted group</DialogTitle>
            <DialogDescription>
              Enter the numeric group ID. Restore clears is_deleted only — shops
              are not reattached automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="restore-group-id">Group ID</Label>
            <Input
              id="restore-group-id"
              inputMode="numeric"
              value={restoreGroupId}
              disabled={restoreBusy}
              onChange={(e) =>
                setRestoreGroupId(e.target.value.replace(/\D/g, ""))
              }
              placeholder="e.g. 5"
            />
            {restoreError ? (
              <p className="text-sm text-destructive">{restoreError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restoreBusy}
              onClick={() => setRestoreOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={restoreBusy || !restoreGroupId.trim()}
              onClick={() => void runRestore()}
            >
              <RotateCcwIcon className="size-4" />
              {restoreBusy ? "Restoring…" : "Restore group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
