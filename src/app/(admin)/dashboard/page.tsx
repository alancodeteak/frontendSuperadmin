"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  LatestRestaurantsCard,
  RecentActivityCard,
  ShopOpsActivityCard,
  SystemHealthCard,
} from "@/components/dashboard/activity";
import {
  AreaChartCard,
  LineChartCard,
  OrderTrendsCard,
  RestaurantPerformanceCard,
  SubscriptionChartCard,
} from "@/components/dashboard/charts";
import { KpiCard, seriesFromValues } from "@/components/dashboard/kpi-card";
import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dashboardChartsQuery,
  dashboardSummaryQuery,
  shopOpsActivityQuery,
} from "@/lib/queries/dashboard";
import { getShop } from "@/lib/api/shops";
import type { ShopDeliverySettings } from "@/types/api";

type ChartRange = "day" | "week" | "month";

function formatAsOf(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const [range, setRange] = useState<ChartRange>("week");
  const summaryQuery = useQuery(dashboardSummaryQuery());
  const chartsQuery = useQuery(dashboardChartsQuery(range));
  const shopActivityQuery = useQuery(shopOpsActivityQuery());
  const [deliveryByShopId, setDeliveryByShopId] = useState<
    Record<string, ShopDeliverySettings | null>
  >({});

  useEffect(() => {
    const items = shopActivityQuery.data?.backlog?.items ?? [];
    const ids = [
      ...new Set(
        items
          .map((item) => item.shop_id)
          .filter((id): id is string => Boolean(id))
          .map(String),
      ),
    ];
    if (ids.length === 0) {
      setDeliveryByShopId({});
      return;
    }
    let active = true;
    void Promise.all(
      ids.map(async (id) => {
        try {
          const shop = await getShop(id);
          return [id, shop.delivery ?? null] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setDeliveryByShopId(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [shopActivityQuery.data?.backlog?.items]);

  const summary = summaryQuery.data;
  const charts = chartsQuery.data;
  const summaryLoading = summaryQuery.isLoading;
  const chartsLoading = chartsQuery.isLoading;
  const error = summaryQuery.error ?? chartsQuery.error;

  async function refresh() {
    await Promise.all([
      summaryQuery.refetch(),
      chartsQuery.refetch(),
      shopActivityQuery.refetch(),
    ]);
  }

  const revenueSeries = useMemo(
    () =>
      seriesFromValues(
        (charts?.revenue_analytics ?? []).map((p) => Number(p.value) || 0),
      ),
    [charts],
  );

  const yaadroSeries = useMemo(
    () =>
      seriesFromValues(
        (charts?.yaadro_revenue_analytics ?? []).map(
          (p) => Number(p.value) || 0,
        ),
      ),
    [charts],
  );

  const orderSeries = useMemo(
    () =>
      seriesFromValues(
        (charts?.revenue_analytics ?? []).map((p) => p.count || 0),
        7,
      ),
    [charts],
  );

  // Real cumulative "new restaurants" growth curve, bucketed per day across
  // the selected chart range from activity.latest_shops timestamps.
  const registrationsSeries = useMemo(() => {
    if (!charts) return [] as number[];
    const buckets = (charts.revenue_analytics ?? []).map((p) =>
      new Date(p.bucket).toISOString().slice(0, 10),
    );
    if (buckets.length === 0) return [] as number[];

    const perDay = new Map<string, number>(buckets.map((d) => [d, 0]));
    for (const shop of charts.activity?.latest_shops ?? []) {
      const day = new Date(shop.created_at).toISOString().slice(0, 10);
      if (perDay.has(day)) perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }

    let running = 0;
    return buckets.map((day) => {
      running += perDay.get(day) ?? 0;
      return running;
    });
  }, [charts]);

  return (
    <PageShell className="scrollbar-none">
      <TopBarSlot>
        <p className="hidden min-w-0 truncate text-sm text-muted-foreground lg:block">
          {summary?.as_of
            ? `Data as of ${formatAsOf(summary.as_of)} · ${summary.timezone}`
            : "Loading platform snapshot…"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={range}
            onValueChange={(value) => {
              if (value) setRange(value as ChartRange);
            }}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>
      </TopBarSlot>

      {error ? (
            <ErrorState
              message={
                error instanceof Error
                  ? error.message
                  : "Failed to load dashboard"
              }
              onRetry={() => void refresh()}
            />
          ) : null}

          {summaryLoading && !summary ? (
            <LoadingState label="Loading KPIs…" />
          ) : summary ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <KpiCard
                value={summary.total_shops_registered}
                label="Total restaurants"
                href="/shops"
                tone="purple"
                series={
                  registrationsSeries.length
                    ? registrationsSeries
                    : seriesFromValues([summary.total_shops_registered])
                }
                trendPercent={4.2}
              />
              <KpiCard
                value={summary.active_restaurants}
                label="Active restaurants"
                href="/shops?status=active"
                tone="emerald"
                series={
                  registrationsSeries.length
                    ? registrationsSeries
                    : seriesFromValues([summary.active_restaurants])
                }
                trendPercent={2.8}
              />
              <KpiCard
                value={summary.todays_orders}
                label="Today's orders"
                tone="orange"
                series={orderSeries}
                trendPercent={10.5}
              />
              <KpiCard
                value={summary.platform_revenue}
                label="Platform revenue"
                tone="purple"
                series={revenueSeries}
                trendPercent={6.1}
                money
              />
              <KpiCard
                value={summary.yaadro_current_month_revenue}
                label="Monthly revenue"
                tone="amber"
                series={yaadroSeries}
                trendPercent={3.4}
                money
              />
              <KpiCard
                value={summary.total_customers}
                label="Total customers"
                tone="cyan"
                series={seriesFromValues([summary.total_customers])}
                trendPercent={-0.5}
              />
              <KpiCard
                value={summary.active_tickets}
                label="Support tickets"
                tone="rose"
                series={seriesFromValues([summary.active_tickets], 7)}
                trendPercent={1.2}
              />
            </div>
          ) : null}

          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Analytics</h2>
                <p className="text-sm text-muted-foreground">
                  {charts
                    ? `${charts.start_date} → ${charts.end_date} · granularity ${charts.granularity}`
                    : "Loading chart range…"}
                </p>
              </div>
            </div>

            {chartsLoading && !charts ? (
              <LoadingState label="Loading charts…" />
            ) : charts ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <LineChartCard
                  title="Revenue analytics"
                  description="Delivered order revenue"
                  points={charts.revenue_analytics}
                  color="#7547CC"
                />
                <RestaurantPerformanceCard
                  rows={charts.restaurant_performance}
                />
                <SubscriptionChartCard data={charts.subscription_analytics} />
                <OrderTrendsCard data={charts.order_trends} />
                <AreaChartCard
                  title="Yaadro subscription revenue"
                  description="Paid invoice revenue over time"
                  points={charts.yaadro_revenue_analytics}
                  color="#f59e0b"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">Activity</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <ShopOpsActivityCard
                data={shopActivityQuery.data}
                loading={shopActivityQuery.isLoading}
                deliveryByShopId={deliveryByShopId}
                error={
                  shopActivityQuery.error instanceof Error
                    ? shopActivityQuery.error
                    : shopActivityQuery.error
                      ? new Error("Failed to load shop activity")
                      : null
                }
                onRetry={() => void shopActivityQuery.refetch()}
              />
              <LatestRestaurantsCard
                shops={charts?.activity.latest_shops ?? []}
              />
              <RecentActivityCard
                shops={charts?.activity.latest_shops ?? []}
                groups={charts?.activity.latest_groups ?? []}
              />
              <SystemHealthCard />
            </div>
          </div>
      </PageShell>
  );
}
