"use client";

import { useState } from "react";

import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import { RingChart } from "@/components/charts/ring-chart";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  RestaurantPerformanceRow,
  TimeSeriesPoint,
} from "@/types/api";

function parseMoney(value: string) {
  return Number(value) || 0;
}

function formatCompactMoney(value: number) {
  return `AED ${new Intl.NumberFormat("en-AE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function formatBucketLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AE", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Dubai",
  });
}

export function LineChartCard({
  title,
  description,
  points,
  color = "#7547CC",
}: {
  title: string;
  description?: string;
  points: TimeSeriesPoint[];
  color?: string;
}) {
  const width = 560;
  const height = 220;
  const pad = { top: 18, right: 14, bottom: 30, left: 54 };
  const values = points.map((point) => parseMoney(point.value));
  const maxValue = Math.max(...values, 1);
  const yMax = Math.ceil(maxValue / 4) * 4 || 4;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const rowCount = 5;
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const ratio = index / (rowCount - 1);
    return {
      y: pad.top + ratio * innerH,
      value: yMax * (1 - ratio),
    };
  });

  const coords = points.map((point, index) => ({
    x:
      pad.left +
      (points.length <= 1
        ? innerW / 2
        : (index / (points.length - 1)) * innerW),
    y: pad.top + innerH - (parseMoney(point.value) / yMax) * innerH,
    label: formatBucketLabel(point.bucket),
    value: parseMoney(point.value),
  }));
  const line = coords
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
    )
    .join(" ");
  const total = values.reduce((sum, value) => sum + value, 0);
  const id = `line-grid-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <p className="text-sm font-semibold tabular-nums text-[#7547CC]">
          {formatCurrency(total)}
        </p>
      </div>

      {points.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No data for range.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-4 h-52 w-full overflow-visible"
          role="img"
          aria-label={`${title}: ${formatCurrency(total)} total`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0" />
              <stop offset="8%" stopColor="#cbd5e1" stopOpacity="0.75" />
              <stop offset="92%" stopColor="#cbd5e1" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {rows.map((row) => (
            <g key={row.y}>
              <line
                x1={pad.left}
                y1={row.y}
                x2={width - pad.right}
                y2={row.y}
                stroke={`url(#${id})`}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={pad.left - 8}
                y={row.y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {formatCompactMoney(row.value)}
              </text>
            </g>
          ))}

          {coords.map((point) => (
            <line
              key={`column-${point.x}`}
              x1={point.x}
              y1={pad.top}
              x2={point.x}
              y2={pad.top + innerH}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 4"
              strokeOpacity="0.35"
            />
          ))}

          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="7"
                fill={color}
                fillOpacity="0.12"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="white"
                stroke={color}
                strokeWidth="2.5"
              >
                <title>
                  {point.label}: {formatCurrency(point.value)}
                </title>
              </circle>
            </g>
          ))}

          {coords
            .filter((_, index) => points.length <= 8 || index % 2 === 0)
            .map((point) => (
              <text
                key={`label-${point.label}-${point.x}`}
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {point.label}
              </text>
            ))}
        </svg>
      )}
    </section>
  );
}

export function AreaChartCard({
  title,
  description,
  points,
  color = "#7547CC",
}: {
  title: string;
  description?: string;
  points: TimeSeriesPoint[];
  color?: string;
}) {
  const width = 560;
  const height = 180;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const values = points.map((p) => parseMoney(p.value));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const coords = points.map((p, i) => {
    const x =
      pad.left +
      (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.top + innerH - ((parseMoney(p.value) - min) / span) * innerH;
    return { x, y, label: formatBucketLabel(p.bucket), value: p.value };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area =
    coords.length > 0
      ? `${line} L${coords[coords.length - 1].x},${pad.top + innerH} L${coords[0].x},${pad.top + innerH} Z`
      : "";

  const total = values.reduce((a, b) => a + b, 0);
  const gradientId = `area-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <p className="text-sm font-medium tabular-nums">
          {formatCurrency(total)}
        </p>
      </div>
      {points.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No data for range.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-44 w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((c) => (
            <circle key={c.label + c.x} cx={c.x} cy={c.y} r="3" fill={color} />
          ))}
          {coords
            .filter((_, i) => points.length <= 8 || i % 2 === 0)
            .map((c) => (
              <text
                key={`lbl-${c.label}-${c.x}`}
                x={c.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {c.label}
              </text>
            ))}
        </svg>
      )}
    </section>
  );
}

export function SubscriptionChartCard({
  data,
}: {
  data: {
    pending: number;
    issued: number;
    paid: number;
    failed: number;
    overdue: number;
    void: number;
  };
}) {
  const rows: { key: string; value: number; color: string }[] = [
    { key: "Paid", value: data.paid, color: "#10b981" },
    { key: "Issued", value: data.issued, color: "#7547CC" },
    { key: "Pending", value: data.pending, color: "#f59e0b" },
    { key: "Overdue", value: data.overdue, color: "#f43f5e" },
    { key: "Failed", value: data.failed, color: "#ef4444" },
    { key: "Void", value: data.void, color: "#94a3b8" },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Subscription analytics</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Invoice counts by status in selected range
      </p>
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="grid grid-cols-[88px_1fr_40px] items-center gap-3">
            <span className="text-sm text-muted-foreground">{row.key}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  background: row.color,
                }}
              />
            </div>
            <span className="text-right text-sm font-medium tabular-nums">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OrderTrendsCard({
  data,
}: {
  data: {
    breakfast: number;
    lunch: number;
    dinner: number;
    other: number;
  };
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const rows = [
    {
      label: "Breakfast",
      value: data.breakfast,
      hint: "07:00–10:59",
      color: "#06b6d4",
    },
    {
      label: "Lunch",
      value: data.lunch,
      hint: "12:30–14:59",
      color: "#7547CC",
    },
    {
      label: "Dinner",
      value: data.dinner,
      hint: "18:00–22:59",
      color: "#f59e0b",
    },
    {
      label: "Other",
      value: data.other,
      hint: "All other hours",
      color: "#64748b",
    },
  ];

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const maxValue = Math.max(total, 1);
  const ringData = rows.map((row) => ({
    label: row.label,
    value: row.value,
    maxValue,
    color: row.color,
  }));

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Orders trends</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Meal periods (Dubai time)
          </p>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No orders in range.</p>
      ) : (
        <div className="mt-4 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <RingChart
            data={ringData}
            size={260}
            strokeWidth={14}
            ringGap={8}
            baseInnerRadius={52}
            hoveredIndex={hoveredIndex}
            onHoverChange={setHoveredIndex}
            className="mx-auto"
          >
            {ringData.map((item, index) => (
              <Ring key={item.label} index={index} />
            ))}
            <RingCenter defaultLabel="Total Orders" />
          </RingChart>

          <div className="min-w-0">
            <h4 className="mb-3 text-sm font-semibold">Orders by meal period</h4>
            <ul className="space-y-3">
              {rows.map((row, index) => {
                const percent =
                  maxValue > 0 ? Math.round((row.value / maxValue) * 100) : 0;
                const active =
                  hoveredIndex === null || hoveredIndex === index;

                return (
                  <li
                    key={row.label}
                    className={cn(
                      "rounded-lg transition-opacity",
                      active ? "opacity-100" : "opacity-40",
                    )}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {row.label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.value.toLocaleString("en-AE")}
                      </span>
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: row.color,
                        }}
                        title={row.hint}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export function RestaurantPerformanceCard({
  rows,
}: {
  rows: RestaurantPerformanceRow[];
}) {
  const maxRevenue = Math.max(...rows.map((r) => parseMoney(r.revenue)), 1);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Restaurant performance</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Top shops by delivered revenue
      </p>
      <ul className="mt-5 space-y-4">
        {rows.map((row) => (
          <li key={row.shop_id}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.shop_name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.delivered_orders} orders · {row.on_time_percent.toFixed(1)}%
                  on-time
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCurrency(parseMoney(row.revenue))}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-primary")}
                style={{
                  width: `${(parseMoney(row.revenue) / maxRevenue) * 100}%`,
                }}
              />
            </div>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-muted-foreground">No restaurants in range.</li>
        ) : null}
      </ul>
    </section>
  );
}
