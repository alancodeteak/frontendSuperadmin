"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PosTenantValue = {
  account: string;
  location: string;
};

function TenantPair({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PosTenantValue;
  onChange: (next: PosTenantValue) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Account</Label>
          <Input
            value={value.account}
            onChange={(e) => onChange({ ...value, account: e.target.value })}
            placeholder="ACC001"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Input
            value={value.location}
            onChange={(e) => onChange({ ...value, location: e.target.value })}
            placeholder="LOC001"
          />
        </div>
      </div>
    </div>
  );
}

export function PosTenantFields({
  menuTenant,
  orderTenant,
  onMenuTenantChange,
  onOrderTenantChange,
}: {
  menuTenant: PosTenantValue;
  orderTenant: PosTenantValue;
  onMenuTenantChange: (next: PosTenantValue) => void;
  onOrderTenantChange: (next: PosTenantValue) => void;
}) {
  return (
    <div className="space-y-4">
      <TenantPair
        label="Menu tenant (catalog pull)"
        value={menuTenant}
        onChange={onMenuTenantChange}
      />
      <TenantPair
        label="Order tenant (outbound push query)"
        value={orderTenant}
        onChange={onOrderTenantChange}
      />
    </div>
  );
}
