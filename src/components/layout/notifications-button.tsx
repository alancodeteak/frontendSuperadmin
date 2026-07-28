"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Bell } from "@/components/animate-ui/icons/bell";
import { BellRing } from "@/components/animate-ui/icons/bell-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  dashboardChartsQuery,
  dashboardSummaryQuery,
} from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

const READ_STORAGE_KEY = "yaadro.superadmin.notifications.read";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
};

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-AE", {
      timeZone: "Asia/Dubai",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  const summaryQuery = useQuery(dashboardSummaryQuery());
  const chartsQuery = useQuery(dashboardChartsQuery("week"));

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const notifications = useMemo(() => {
    const items: AppNotification[] = [];
    const asOf =
      chartsQuery.data?.as_of ??
      summaryQuery.data?.as_of ??
      new Date().toISOString();

    const overdue = chartsQuery.data?.subscription_analytics.overdue ?? 0;
    if (overdue > 0) {
      items.push({
        id: `overdue-${overdue}`,
        title: "Overdue invoices",
        body: `${overdue} subscription invoice${overdue === 1 ? "" : "s"} overdue.`,
        href: "/invoice?status=OVERDUE",
        createdAt: asOf,
      });
    }

    const pending = chartsQuery.data?.subscription_analytics.pending ?? 0;
    if (pending > 0) {
      items.push({
        id: `pending-${pending}`,
        title: "Pending invoices",
        body: `${pending} invoice${pending === 1 ? "" : "s"} awaiting payment.`,
        href: "/invoice?status=PENDING",
        createdAt: asOf,
      });
    }

    const tickets = summaryQuery.data?.active_tickets ?? 0;
    if (tickets > 0) {
      items.push({
        id: `tickets-${tickets}`,
        title: "Active tickets",
        body: `${tickets} support ticket${tickets === 1 ? "" : "s"} still open.`,
        href: "/dashboard",
        createdAt: asOf,
      });
    }

    for (const shop of (chartsQuery.data?.activity.latest_shops ?? []).slice(
      0,
      4,
    )) {
      items.push({
        id: `shop-${shop.shop_id}-${shop.created_at}`,
        title: "New shop registered",
        body: `${shop.shop_name || shop.shop_id} joined the platform.`,
        href: `/shops/${encodeURIComponent(shop.shop_id)}`,
        createdAt: shop.created_at,
      });
    }

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [chartsQuery.data, summaryQuery.data]);

  const unread = notifications.filter((item) => !readIds.has(item.id));
  const hasNotifications = unread.length > 0;
  const badgeCount = unread.length > 99 ? "99+" : String(unread.length);

  function markAllRead() {
    const next = new Set(readIds);
    for (const item of notifications) next.add(item.id);
    setReadIds(next);
    saveReadIds(next);
  }

  function markRead(id: string) {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={
          hasNotifications
            ? `Notifications, ${unread.length} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative"
        title="Notifications"
      >
        {hasNotifications ? (
          <BellRing size={16} animateOnHover />
        ) : (
          <Bell size={16} animateOnHover />
        )}
        {hasNotifications ? (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
          >
            {badgeCount}
          </Badge>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {hasNotifications
                  ? `${unread.length} unread`
                  : "You're all caught up"}
              </p>
            </div>
            {hasNotifications ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={markAllRead}
              >
                Mark all read
              </Button>
            ) : null}
          </div>

          <ul className="max-h-80 overflow-auto py-1">
            {notifications.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications right now.
              </li>
            ) : (
              notifications.map((item) => {
                const isUnread = !readIds.has(item.id);
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          isUnread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {item.title}
                      </p>
                      {isUnread ? (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatWhen(item.createdAt)}
                    </p>
                  </>
                );

                return (
                  <li key={item.id} className="border-b last:border-b-0">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "block px-3 py-2.5 transition-colors hover:bg-muted/60",
                          isUnread && "bg-primary/5",
                        )}
                        onClick={() => {
                          markRead(item.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "block w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                          isUnread && "bg-primary/5",
                        )}
                        onClick={() => markRead(item.id)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
