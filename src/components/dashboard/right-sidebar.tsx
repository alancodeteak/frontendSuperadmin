"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileBarChartIcon,
  FileSpreadsheetIcon,
  ReceiptIcon,
  RefreshCwIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";

import { SidebarGlobalSearch } from "@/components/dashboard/sidebar-global-search";
import { TOPBAR_HEIGHT_PX } from "@/components/layout/top-bar";
import {
  dashboardChartsQuery,
  dashboardSummaryQuery,
} from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";
import type {
  DashboardChartsResponse,
  DashboardSummaryResponse,
} from "@/types/api";

type DashboardRightSidebarProps = {
  summary?: DashboardSummaryResponse;
  activity?: DashboardChartsResponse["activity"];
};

const WIDTH_KEY = "dashboard-right-sidebar-width";
const TASKS_KEY = "dashboard-right-sidebar-tasks";
const DEFAULT_WIDTH = 288;
const MIN_WIDTH = 240;
const MAX_WIDTH = 520;

const quickLinks = [
  { label: "Manage shops", href: "/shops", icon: StoreIcon },
  { label: "Analytics", href: "/analytics", icon: FileBarChartIcon },
  { label: "Invoices", href: "/invoice", icon: ReceiptIcon },
  { label: "Reports", href: "/reports", icon: FileSpreadsheetIcon },
] as const;

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AE", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value: number | undefined) {
  return Number(value ?? 0).toLocaleString("en-AE");
}

function readCompletedTasks(): string[] {
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function DashboardRightSidebar({
  summary: summaryProp,
  activity: activityProp,
}: DashboardRightSidebarProps = {}) {
  const summaryQuery = useQuery(dashboardSummaryQuery());
  const chartsQuery = useQuery(dashboardChartsQuery("week"));
  const summary = summaryProp ?? summaryQuery.data;
  const activity = activityProp ?? chartsQuery.data?.activity;

  const [completed, setCompleted] = useState<string[]>([]);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);

  const tasks = [
    {
      id: "tickets",
      label: "Review support tickets",
      detail: `${summary?.active_tickets ?? 0} active`,
      href: "/analytics",
      urgent: Boolean(summary?.active_tickets),
    },
    {
      id: "invoices",
      label: "Review pending invoices",
      detail: "Open billing",
      href: "/invoice?status=ISSUED",
      urgent: false,
    },
    {
      id: "shops",
      label: "Check restaurant status",
      detail: `${summary?.active_restaurants ?? 0} active`,
      href: "/shops?status=active",
      urgent: false,
    },
  ];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WIDTH_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed)) setWidth(clampWidth(parsed));
      }
      setCompleted(readCompletedTasks());
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function onPointerMove(event: PointerEvent) {
      const delta = dragStartX.current - event.clientX;
      setWidth(clampWidth(dragStartWidth.current + delta));
    }

    function onPointerUp() {
      setDragging(false);
      setWidth((current) => {
        const next = clampWidth(current);
        try {
          window.localStorage.setItem(WIDTH_KEY, String(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  function beginResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragStartX.current = event.clientX;
    dragStartWidth.current = width;
    setDragging(true);
  }

  function persistWidth(next: number) {
    setWidth(next);
    try {
      window.localStorage.setItem(WIDTH_KEY, String(next));
    } catch {
      // ignore
    }
  }

  function toggleTask(id: string) {
    setCompleted((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      try {
        window.localStorage.setItem(TASKS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const latestShops = (activity?.latest_shops ?? []).slice(0, 6);
  const refreshing = summaryQuery.isFetching || chartsQuery.isFetching;

  return (
    <motion.aside
      data-slot="dashboard-right-sidebar"
      className="relative hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-l bg-sidebar text-sidebar-foreground xl:flex"
      initial={false}
      animate={{ width }}
      transition={
        dragging
          ? { duration: 0 }
          : { type: "spring", stiffness: 380, damping: 36, mass: 0.7 }
      }
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right sidebar"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={beginResize}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            persistWidth(clampWidth(width + 16));
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            persistWidth(clampWidth(width - 16));
          }
        }}
        className={cn(
          "absolute inset-y-0 left-0 z-20 w-1.5 -translate-x-1/2 cursor-col-resize touch-none",
          "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition-colors",
          "hover:after:bg-primary/50 focus-visible:outline-none focus-visible:after:bg-primary",
          dragging && "after:bg-primary",
        )}
      />

      <div
        className="flex shrink-0 items-center border-b px-3"
        style={{ height: TOPBAR_HEIGHT_PX }}
      >
        <SidebarGlobalSearch />
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 scrollbar-none">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <h2 className="text-xs font-medium tracking-wide text-sidebar-foreground/70 uppercase">
              Quick access
            </h2>
            <button
              type="button"
              aria-label="Refresh sidebar data"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => {
                void summaryQuery.refetch();
                void chartsQuery.refetch();
              }}
            >
              <RefreshCwIcon
                className={cn("size-3.5", refreshing && "animate-spin")}
              />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {quickLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <h2 className="text-xs font-medium tracking-wide text-sidebar-foreground/70 uppercase">
              Latest restaurants
            </h2>
            <Link
              href="/shops"
              className="text-[10px] font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="flex flex-col gap-1">
            {latestShops.map((shop) => (
              <li key={shop.shop_id}>
                <Link
                  href={`/shops/${shop.shop_id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold">
                    {shop.shop_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {shop.shop_name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {shop.shop_id} · {formatDate(shop.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {!latestShops.length ? (
              <li className="px-2 py-4 text-sm text-muted-foreground">
                {chartsQuery.isPending
                  ? "Loading restaurants…"
                  : "No recent restaurants."}
              </li>
            ) : null}
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <h2 className="text-xs font-medium tracking-wide text-sidebar-foreground/70 uppercase">
              Admin tasks
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              {completed.length}/{tasks.length}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {tasks.map((task) => {
              const done = completed.includes(task.id);
              return (
                <li key={task.id}>
                  <div className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent/70">
                    <button
                      type="button"
                      aria-label={`Mark ${task.label} ${done ? "incomplete" : "complete"}`}
                      className="mt-0.5 text-primary"
                      onClick={() => toggleTask(task.id)}
                    >
                      {done ? (
                        <CheckCircle2Icon className="size-4" />
                      ) : (
                        <CircleIcon className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    <Link href={task.href} className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        {task.label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex items-center gap-1 text-[11px]",
                          task.urgent
                            ? "text-amber-700"
                            : "text-muted-foreground",
                        )}
                      >
                        {task.urgent ? (
                          <AlertCircleIcon className="size-3" />
                        ) : null}
                        {task.detail}
                      </span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="border-t p-3">
        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent">
            <UsersIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Customer reach</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatNumber(summary?.total_customers)} total ·{" "}
              {formatNumber(summary?.customers_under_shops)} under shops
            </p>
          </div>
        </Link>
      </div>
    </motion.aside>
  );
}
