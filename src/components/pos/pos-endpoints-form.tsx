"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  POS_ENDPOINT_KEYS,
  type PosEndpointKey,
} from "@/lib/pos/contract";
import type { PosEndpointDef } from "@/lib/pos/config-model";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const ENDPOINT_HINTS: Record<PosEndpointKey, string> = {
  menu: "Combined menu fetch (catalog pull_combined)",
  menuCategories: "Categories only (catalog pull_split)",
  menuProducts: "Products only (catalog pull_split)",
  orderCreate: "Push new order to POS",
  orderStatus: "Push status update to POS",
  riderSync: "Sync rider / delivery partner to POS",
};

export function PosEndpointsForm({
  value,
  onChange,
}: {
  value: Partial<Record<PosEndpointKey, PosEndpointDef>>;
  onChange: (next: Partial<Record<PosEndpointKey, PosEndpointDef>>) => void;
}) {
  function update(key: PosEndpointKey, patch: Partial<PosEndpointDef>) {
    const current = value[key] ?? { method: "GET", path: "" };
    onChange({ ...value, [key]: { ...current, ...patch } });
  }

  function toggle(key: PosEndpointKey, enabled: boolean) {
    if (!enabled) {
      const next = { ...value };
      delete next[key];
      onChange(next);
      return;
    }
    onChange({
      ...value,
      [key]: value[key] ?? { method: "GET", path: "" },
    });
  }

  return (
    <div className="space-y-4">
      {POS_ENDPOINT_KEYS.map((key) => {
        const ep = value[key];
        const enabled = Boolean(ep);
        return (
          <div
            key={key}
            className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3"
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={enabled}
                onChange={(e) => toggle(key, e.target.checked)}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{key}</span>
                <span className="text-xs text-muted-foreground">
                  {ENDPOINT_HINTS[key]}
                </span>
              </span>
            </label>
            {enabled ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Method</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={ep?.method ?? "GET"}
                    onChange={(e) => update(key, { method: e.target.value })}
                  >
                    {HTTP_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Path</Label>
                  <Input
                    value={ep?.path ?? ""}
                    onChange={(e) => update(key, { path: e.target.value })}
                    placeholder="/api/orders"
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
