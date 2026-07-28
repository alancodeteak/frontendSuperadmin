"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinIcon, PlusIcon, RotateCcwIcon } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { restoreShop } from "@/lib/api/shops";
import { appToast } from "@/lib/app-toast";
import { shopsListQuery } from "@/lib/queries/shops";
import type { ShopListItem } from "@/types/api";

function shopPhotoUrl(shop: ShopListItem): string | null {
  const candidates = [
    shop.photo_url,
    shop.profile?.photo_url,
    shop.photo,
    shop.profile?.photo,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value || value === "null" || value === "undefined") continue;
    return value;
  }
  return null;
}

function shopInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ShopAvatar({ shop }: { shop: ShopListItem }) {
  const [broken, setBroken] = useState(false);
  const name = shop.shop_name || shop.profile?.shop_name || shop.shop_id;
  const photo = shopPhotoUrl(shop);
  const showPhoto = Boolean(photo) && !broken;

  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold text-muted-foreground">
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo!}
          alt=""
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        shopInitials(name)
      )}
    </span>
  );
}

function CopyableValue({
  value,
  display,
  mono = false,
}: {
  value: string;
  display?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={mono ? "truncate font-mono text-xs" : "truncate"}>
        {display ?? value}
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

function shopAddressLabel(shop: ShopListItem): string | null {
  const address = shop.address;
  if (!address) return null;
  return (
    [
      address.address_line_1,
      address.address_line_2,
      address.locality,
      address.city,
    ]
      .filter(Boolean)
      .join(", ") || null
  );
}

function ShopAddressCell({ shop }: { shop: ShopListItem }) {
  const address = shopAddressLabel(shop);
  const lat = shop.address?.latitude;
  const lng = shop.address?.longitude;
  const hasCoordinates =
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng);

  if (!address) return <span className="text-muted-foreground">—</span>;

  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const embedUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1.5 underline-offset-4 hover:text-primary hover:underline"
            />
          }
        >
          <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{address}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={8}
          className="block w-72 max-w-none rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          <div className="h-40 overflow-hidden rounded-lg bg-muted">
            <iframe
              title={`Map preview for ${shop.shop_name}`}
              src={embedUrl}
              loading="lazy"
              className="pointer-events-none size-full border-0"
              referrerPolicy="no-referrer-when-downgrade"
              tabIndex={-1}
            />
          </div>
          <p className="mt-2 line-clamp-2 text-xs">{address}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Click the address to open Google Maps
          </p>
        </TooltipContent>
      </Tooltip>
      <CopyButton
        value={address}
        iconOnly
        size={13}
        label="Copy address"
        className="size-6 shrink-0 p-0"
      />
    </div>
  );
}

const shopColumns: ColumnDef<ShopListItem>[] = [
  {
    accessorKey: "shop_name",
    header: "Shop",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ShopAvatar shop={row.original} />
        <span className="font-medium">{row.original.shop_name}</span>
      </div>
    ),
    meta: { label: "Shop" },
    size: 220,
  },
  {
    accessorKey: "shop_id",
    header: "Shop ID",
    cell: ({ row }) => (
      <CopyableValue value={row.original.shop_id} mono />
    ),
    meta: { label: "Shop ID" },
    size: 210,
  },
  {
    accessorKey: "user_id",
    header: "User ID",
    cell: ({ row }) =>
      row.original.user_id == null ? (
        "—"
      ) : (
        <CopyableValue value={String(row.original.user_id)} mono />
      ),
    meta: { label: "User ID" },
    size: 120,
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
    size: 165,
  },
  {
    id: "address",
    accessorFn: shopAddressLabel,
    header: "Address",
    cell: ({ row }) => <ShopAddressCell shop={row.original} />,
    meta: { label: "Address" },
    size: 280,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { label: "Status" },
    size: 100,
  },
];

export default function ShopsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const fromUrl = searchParams.get("q") ?? "";
    setQ(fromUrl);
    setPage(1);
  }, [searchParams]);

  const shopsQuery = useQuery(
    shopsListQuery({
      page,
      limit: 20,
      q: q || undefined,
      status: status === "all" || status === "deleted" ? undefined : status,
      include_deleted: status === "deleted" ? true : undefined,
      deleted_only: status === "deleted" ? true : undefined,
    }),
  );

  const items = shopsQuery.data?.items ?? [];
  const total = shopsQuery.data?.total;
  const loading = shopsQuery.isPending;
  const error = shopsQuery.error
    ? shopsQuery.error instanceof Error
      ? shopsQuery.error.message
      : "Failed to load shops"
    : null;
  const load = () => void shopsQuery.refetch();

  async function handleRestore(shopId: string) {
    if (!confirm(`Restore shop ${shopId}?`)) return;
    try {
      await restoreShop(shopId);
      await queryClient.invalidateQueries({ queryKey: ["shops"] });
      appToast.success("Shop restored.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Restore failed";
      appToast.error(message);
    }
  }

  const columns: ColumnDef<ShopListItem>[] = [
    ...shopColumns,
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      size: 92,
      cell: ({ row }) =>
        row.original.is_deleted || row.original.status === "deleted" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={(event) => {
              event.stopPropagation();
              void handleRestore(row.original.shop_id);
            }}
          >
            <RotateCcwIcon className="size-3.5" />
            Restore
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

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
            placeholder="Search shops…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </AnimateIcon>
        <Select
          value={status}
          onValueChange={(value) => {
            setPage(1);
            setStatus(value ?? "all");
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="deleted">Soft deleted</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="ml-auto shrink-0"
          render={<Link href="/shops/new" />}
        >
          <PlusIcon className="size-4" />
          Create shop
        </Button>
      </TopBarSlot>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No shops found"
          description="Create a shop or adjust your filters."
          action={
            <Button render={<Link href="/shops/new" />}>Create shop</Button>
          }
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <DataTable
          columns={columns}
          data={items}
          hideSearch
          emptyMessage="No shops match this filter."
          getRowId={(row) => row.shop_id}
          onRowClick={(shop) => router.push(`/shops/${shop.shop_id}`)}
          serverPagination={{
            pageIndex: page - 1,
            pageSize: 20,
            total,
            hasNextPage: items.length >= 20,
            onPageChange: (pageIndex) => setPage(pageIndex + 1),
          }}
        />
      ) : null}
    </PageShell>
  );
}
