"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { LoadingState, StatusBadge } from "@/components/shared/states";
import { formatOrderStatusLabel } from "@/lib/orders/order-status";
import { systemHealthQuery } from "@/lib/queries/dashboard";
import type {
  DashboardChartsResponse,
  ShopActivityResponse,
  ShopDeliverySettings,
} from "@/types/api";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LatestRestaurantsCard({
  shops,
}: {
  shops: DashboardChartsResponse["activity"]["latest_shops"];
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Latest restaurants</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Most recently created shops
      </p>
      <ul className="mt-4 divide-y">
        {shops.map((shop) => (
          <li key={shop.shop_id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <Link
                href={`/shops/${shop.shop_id}`}
                className="truncate font-medium hover:text-primary"
              >
                {shop.shop_name}
              </Link>
              <p className="text-xs text-muted-foreground">{shop.shop_id}</p>
            </div>
            <time className="shrink-0 text-xs text-muted-foreground">
              {formatWhen(shop.created_at)}
            </time>
          </li>
        ))}
        {shops.length === 0 ? (
          <li className="py-6 text-sm text-muted-foreground">No recent shops.</li>
        ) : null}
      </ul>
    </section>
  );
}

export function RecentActivityCard({
  shops,
  groups,
}: {
  shops: DashboardChartsResponse["activity"]["latest_shops"];
  groups: DashboardChartsResponse["activity"]["latest_groups"];
}) {
  const events = [
    ...shops.map((s) => ({
      id: `shop-${s.shop_id}`,
      title: `Shop created: ${s.shop_name}`,
      at: s.created_at,
    })),
    ...groups.map((g) => ({
      id: `group-${g.id}`,
      title: `Group created: ${g.name}`,
      at: g.created_at,
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Recent activities</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Latest shops and groups
      </p>
      <ul className="mt-4 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0">
              <p className="text-sm">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatWhen(event.at)}
              </p>
            </div>
          </li>
        ))}
        {events.length === 0 ? (
          <li className="text-sm text-muted-foreground">No recent activity.</li>
        ) : null}
      </ul>
    </section>
  );
}

function asCount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

export function ShopOpsActivityCard({
  data,
  loading,
  error,
  onRetry,
  deliveryByShopId,
}: {
  data?: ShopActivityResponse | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  deliveryByShopId?: Record<string, ShopDeliverySettings | null | undefined>;
}) {
  const counts = data?.order_counts ?? {};
  const backlogItems = data?.backlog?.items ?? [];
  const activityItems = data?.activity?.items ?? [];
  const countEntries = [
    { label: "Today", value: asCount(counts.today ?? counts.total) },
    { label: "Pending", value: asCount(counts.pending) },
    { label: "Completed", value: asCount(counts.completed) },
    { label: "Cancelled", value: asCount(counts.cancelled) },
  ].filter((row) => row.value != null);

  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Shop ops activity</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Live order counts, backlog, and day activity from /shops/activity
          </p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Refresh
          </button>
        ) : null}
      </div>

      {loading && !data ? (
        <LoadingState className="py-8" />
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-destructive">
          {error.message || "Failed to load shop activity"}
        </p>
      ) : null}

      {data ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Order counts
            </p>
            <ul className="space-y-2">
              {countEntries.length > 0 ? (
                countEntries.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.value}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No counts.</li>
              )}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Backlog
              {typeof data.backlog?.total === "number"
                ? ` · ${data.backlog.total}`
                : ""}
            </p>
            <ul className="space-y-2">
              {backlogItems.length > 0 ? (
                backlogItems.slice(0, 6).map((item, index) => (
                  <li key={String(item.id ?? index)} className="text-sm">
                    <p className="font-medium">
                      {String(item.id ?? "Order")}
                      {item.status ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {formatOrderStatusLabel(
                            String(item.status),
                            item.shop_id
                              ? deliveryByShopId?.[String(item.shop_id)] ?? null
                              : null,
                          )}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[item.shop, item.shop_id, item.age_min != null ? `${item.age_min}m` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No backlog.</li>
              )}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Activity feed
              {typeof data.activity?.total === "number"
                ? ` · ${data.activity.total}`
                : ""}
            </p>
            <ul className="space-y-2">
              {activityItems.length > 0 ? (
                activityItems.slice(0, 6).map((item, index) => (
                  <li key={`${item.at ?? "at"}-${index}`} className="text-sm">
                    <p>{String(item.event ?? "Event")}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.at, item.shop_name, item.shop_id]
                        .filter(Boolean)
                        .map(String)
                        .join(" · ") || "—"}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No activity.</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function SystemHealthCard() {
  const healthQuery = useQuery(systemHealthQuery());
  const health = healthQuery.data;
  const error = healthQuery.error;

  const rawChecks = health?.checks;
  const entries: Array<[string, string]> = Array.isArray(rawChecks)
    ? rawChecks.map((c: { name?: string; ok?: boolean }, i: number) => [
        c.name ?? `check-${i}`,
        c.ok === true ? "ok" : c.ok === false ? "down" : String(c.ok ?? "unknown"),
      ])
    : Object.entries((rawChecks ?? {}) as Record<string, unknown>).map(
        ([key, value]) => [key, String(value)],
      );

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">System health</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Polled from /health every 45s
          </p>
        </div>
        {health?.status ? <StatusBadge status={String(health.status)} /> : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Health check failed"}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.length > 0
            ? entries.map(([key, value]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="capitalize text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </span>
                  <StatusBadge status={String(value)} />
                </li>
              ))
            : (
              <li className="text-sm text-muted-foreground">Checking…</li>
            )}
        </ul>
      )}
    </section>
  );
}
