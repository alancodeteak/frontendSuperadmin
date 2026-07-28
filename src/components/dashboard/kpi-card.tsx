"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

type KpiTone = "blue" | "orange" | "purple" | "emerald" | "rose" | "cyan" | "amber";

const toneStyles: Record<KpiTone, { stroke: string; fill: string }> = {
  blue: { stroke: "#7547CC", fill: "#7547CC" },
  orange: { stroke: "#f59e0b", fill: "#f59e0b" },
  purple: { stroke: "#7547CC", fill: "#7547CC" },
  emerald: { stroke: "#10b981", fill: "#10b981" },
  rose: { stroke: "#f43f5e", fill: "#f43f5e" },
  cyan: { stroke: "#06b6d4", fill: "#06b6d4" },
  amber: { stroke: "#d97706", fill: "#d97706" },
};

/**
 * Smooth single-line area path built with a Catmull-Rom → cubic-bezier
 * conversion so the curve flows through every real data point.
 */
function buildSmoothArea(
  values: number[],
  width: number,
  height: number,
  padY: number,
) {
  if (values.length === 0) {
    return { line: "", area: "", last: null as null | { x: number; y: number } };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerH = height - padY * 2;

  const points = values.map((v, i) => ({
    x: (i / Math.max(values.length - 1, 1)) * width,
    y: padY + innerH - ((v - min) / span) * innerH,
  }));

  if (points.length === 1) {
    points.unshift({ x: 0, y: points[0].y });
    points.push({ x: width, y: points[0].y });
  }

  let line = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    line += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area, last: points[points.length - 1] };
}

export function KpiCard({
  value,
  label,
  href,
  tone = "purple",
  series,
  trendPercent,
  money = false,
  fadeEdges = true,
  className,
}: {
  value: string | number;
  label: string;
  href?: string;
  tone?: KpiTone;
  series: number[];
  trendPercent?: number;
  money?: boolean;
  fadeEdges?: boolean;
  className?: string;
}) {
  const colors = toneStyles[tone];
  const uid = useId().replace(/:/g, "");
  const fillId = `kpi-fill-${uid}`;
  const edgeId = `kpi-edge-${uid}`;
  const maskId = `kpi-mask-${uid}`;

  const display =
    money && typeof value === "string"
      ? formatCurrency(Number(value) || 0)
      : typeof value === "number"
        ? value.toLocaleString("en-AE")
        : Number.isFinite(Number(value)) && !String(value).includes(".")
          ? Number(value).toLocaleString("en-AE")
          : String(value);

  const width = 320;
  const height = 72;
  const { line, area, last } = useMemo(
    () => buildSmoothArea(series, width, height, 6),
    [series],
  );

  const animKey = useMemo(
    () => series.map((n) => Math.round(n)).join("-"),
    [series],
  );

  const trendUp = (trendPercent ?? 0) >= 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {display}
            </p>
            {typeof trendPercent === "number" ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  trendUp ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {trendUp ? (
                  <ArrowUpRightIcon className="size-3.5" />
                ) : (
                  <ArrowDownRightIcon className="size-3.5" />
                )}
                {Math.abs(trendPercent).toFixed(1)}%
              </span>
            ) : null}
          </div>
          {href ? (
            <Link
              href={href}
              className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {label}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{label}</p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-16 w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity={0.32} />
              <stop offset="100%" stopColor={colors.fill} stopOpacity={0.02} />
            </linearGradient>
            {fadeEdges ? (
              <>
                <linearGradient id={edgeId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fff" stopOpacity={0} />
                  <stop offset="14%" stopColor="#fff" stopOpacity={1} />
                  <stop offset="86%" stopColor="#fff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
                <mask id={maskId}>
                  <rect width={width} height={height} fill={`url(#${edgeId})`} />
                </mask>
              </>
            ) : null}
          </defs>

          <g mask={fadeEdges ? `url(#${maskId})` : undefined}>
            <motion.path
              key={`area-${animKey}`}
              d={area}
              fill={`url(#${fillId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            />
            <motion.path
              key={`line-${animKey}`}
              d={line}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.85, 0, 0.15, 1] }}
            />
          </g>

          {last ? (
            <motion.circle
              key={`dot-${animKey}`}
              cx={last.x}
              cy={last.y}
              r={3}
              fill={colors.stroke}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, type: "spring", stiffness: 400, damping: 20 }}
            />
          ) : null}
        </svg>
      </div>
    </article>
  );
}

export function seriesFromValues(
  values: number[],
  fallbackLength = 8,
): number[] {
  if (values.length >= 2) return values;
  const seed = values[0] ?? 10;
  return Array.from({ length: fallbackLength }, (_, i) =>
    Math.max(0, seed * (0.7 + (i / fallbackLength) * 0.5 + Math.sin(i * 1.3) * 0.08)),
  );
}
