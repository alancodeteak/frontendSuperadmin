"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileBarChartIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
  UnplugIcon,
  UserRoundIcon,
} from "lucide-react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Search } from "@/components/animate-ui/icons/search";
import {
  fetchSearchSuggestions,
  getSearchStatus,
  syncSearchIndex,
} from "@/lib/search/search-api";
import type { SearchHit, SearchHitType } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const placeholders = [
  "Search shops by name or ID…",
  "Find a rider…",
  "Look up a POS template…",
  "Jump to reports…",
  "Search invoices…",
];

const typeMeta: Record<
  SearchHitType,
  { label: string; icon: typeof StoreIcon }
> = {
  shop: { label: "Shop", icon: StoreIcon },
  rider: { label: "Rider", icon: UserRoundIcon },
  pos: { label: "POS", icon: UnplugIcon },
  invoice: { label: "Invoice", icon: ReceiptIcon },
  page: { label: "Page", icon: LayoutDashboardIcon },
};

function pageIcon(href: string) {
  if (href.startsWith("/reports")) return FileSpreadsheetIcon;
  if (href.startsWith("/analytics")) return FileBarChartIcon;
  if (href.startsWith("/settings")) return SettingsIcon;
  if (href.startsWith("/invoice")) return ReceiptIcon;
  if (href.startsWith("/pos")) return UnplugIcon;
  if (href.startsWith("/shops")) return StoreIcon;
  return LayoutDashboardIcon;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function SidebarGlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 180);

  const statusQuery = useQuery({
    queryKey: ["search", "status"],
    queryFn: getSearchStatus,
    staleTime: 60_000,
  });

  const suggestQuery = useQuery({
    queryKey: ["search", "suggest", debouncedQuery],
    queryFn: () => fetchSearchSuggestions(debouncedQuery, 12),
    enabled: open,
    placeholderData: (previous) => previous,
  });

  const suggestions = suggestQuery.data?.suggestions ?? [];
  const engine = suggestQuery.data?.engine;
  const meiliConfigured = Boolean(statusQuery.data?.configured);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholders.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, suggestions.length]);

  useEffect(() => {
    if (!meiliConfigured) return;
    const key = "superadmin-search-synced-at";
    try {
      const last = Number(window.localStorage.getItem(key) ?? "0");
      if (Date.now() - last < 15 * 60_000) return;
    } catch {
      // ignore
    }

    let cancelled = false;
    setSyncing(true);
    void syncSearchIndex()
      .then((result) => {
        if (cancelled) return;
        try {
          window.localStorage.setItem(key, String(Date.now()));
        } catch {
          // ignore
        }
        setSyncNote(
          `Indexed ${result.indexed} docs · ${result.processingTimeMs}ms`,
        );
        void suggestQuery.refetch();
      })
      .catch(() => {
        if (!cancelled) setSyncNote(null);
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once when Meili becomes available
  }, [meiliConfigured]);

  function goTo(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (suggestions[activeIndex]) {
      goTo(suggestions[activeIndex]);
      return;
    }
    const q = query.trim();
    if (!q) return;
    router.push(`/shops?q=${encodeURIComponent(q)}`);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <AnimateIcon animateOnHover className="relative block h-10 w-full">
        <form
          className={cn(
            "relative h-full w-full overflow-hidden rounded-full border border-border bg-muted/60 transition duration-200",
            query && "bg-muted",
            open && "ring-2 ring-primary/20",
          )}
          onSubmit={onSubmit}
          role="search"
        >
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 z-20 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (!open) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((i) =>
                  suggestions.length ? (i + 1) % suggestions.length : 0,
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((i) =>
                  suggestions.length
                    ? (i - 1 + suggestions.length) % suggestions.length
                    : 0,
                );
              } else if (event.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
            type="search"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            aria-label="Global search"
            className="relative z-10 h-full w-full rounded-full border-none bg-transparent pr-10 pl-10 text-sm text-foreground outline-none focus:ring-0"
          />
          {!query ? (
            <span className="pointer-events-none absolute inset-y-0 left-10 right-3 flex items-center truncate text-sm text-muted-foreground">
              {placeholders[placeholderIndex]}
            </span>
          ) : null}
          {(suggestQuery.isFetching || syncing) && open ? (
            <Loader2Icon className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </form>
      </AnimateIcon>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
            <span>
              {engine === "meilisearch"
                ? "Meilisearch"
                : engine === "federated"
                  ? "Live search"
                  : "Search"}
              {suggestQuery.data?.processingTimeMs != null
                ? ` · ${suggestQuery.data.processingTimeMs}ms`
                : ""}
            </span>
            {meiliConfigured ? (
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                disabled={syncing}
                onClick={() => {
                  setSyncing(true);
                  void syncSearchIndex()
                    .then((result) => {
                      setSyncNote(
                        `Indexed ${result.indexed} docs · ${result.processingTimeMs}ms`,
                      );
                      void suggestQuery.refetch();
                    })
                    .catch((error: unknown) => {
                      setSyncNote(
                        error instanceof Error ? error.message : "Sync failed",
                      );
                    })
                    .finally(() => setSyncing(false));
                }}
              >
                {syncing ? "Syncing…" : "Reindex"}
              </button>
            ) : (
              <span>API fallback</span>
            )}
          </div>

          {suggestions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {debouncedQuery
                ? "No matches. Try a shop ID, rider name, or invoice number."
                : "Type to search shops, riders, POS, invoices, and pages."}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1 scrollbar-none">
              {suggestions.map((hit, index) => {
                const meta = typeMeta[hit.type];
                const Icon =
                  hit.type === "page" ? pageIcon(hit.href) : meta.icon;
                const active = index === activeIndex;
                return (
                  <li key={hit.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/70",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goTo(hit)}
                    >
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {hit.title}
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                            {meta.label}
                          </span>
                        </span>
                        {hit.subtitle ? (
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {syncNote ? (
            <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              {syncNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
