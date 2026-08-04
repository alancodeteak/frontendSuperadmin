"use client";

import { Label } from "@/components/ui/label";
import {
  POS_CAPABILITY_CATALOG,
  POS_CAPABILITY_ORDERS_IN,
  POS_CAPABILITY_ORDERS_OUT,
  POS_CAPABILITY_RIDERS,
  POS_CAPABILITY_STATUS_IN,
  POS_CAPABILITY_STATUS_OUT,
  type PosCapabilities,
} from "@/lib/pos/contract";

function CapSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <select
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PosCapabilitiesForm({
  value,
  onChange,
}: {
  value: PosCapabilities;
  onChange: (next: PosCapabilities) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CapSelect
        label="Catalog"
        value={value.catalog}
        options={POS_CAPABILITY_CATALOG}
        onChange={(catalog) => onChange({ ...value, catalog })}
      />
      <CapSelect
        label="Orders out"
        value={value.orders_out}
        options={POS_CAPABILITY_ORDERS_OUT}
        onChange={(orders_out) => onChange({ ...value, orders_out })}
      />
      <CapSelect
        label="Orders in"
        value={value.orders_in}
        options={POS_CAPABILITY_ORDERS_IN}
        onChange={(orders_in) => onChange({ ...value, orders_in })}
      />
      <CapSelect
        label="Status out"
        value={value.status_out}
        options={POS_CAPABILITY_STATUS_OUT}
        onChange={(status_out) => onChange({ ...value, status_out })}
      />
      <CapSelect
        label="Status in"
        value={value.status_in}
        options={POS_CAPABILITY_STATUS_IN}
        onChange={(status_in) => onChange({ ...value, status_in })}
      />
      <CapSelect
        label="Riders"
        value={value.riders}
        options={POS_CAPABILITY_RIDERS}
        onChange={(riders) => onChange({ ...value, riders })}
      />
    </div>
  );
}
