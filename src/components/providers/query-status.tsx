"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";

import { cn } from "@/lib/utils";

export function QueryStatus({ className }: { className?: string }) {
  const fetching = useIsFetching();
  const mutating = useIsMutating();

  if (mutating > 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-amber-700",
          className,
        )}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
        Saving
      </span>
    );
  }

  if (fetching > 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-primary",
          className,
        )}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
        Syncing
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      API ready
    </span>
  );
}
