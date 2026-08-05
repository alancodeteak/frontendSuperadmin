"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { key: string; value: string };

function toRows(map: Record<string, string>): Row[] {
  const entries = Object.entries(map);
  return entries.length ? entries.map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }];
}

function fromRows(rows: Row[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (!k) continue;
    out[k] = row.value.trim();
  }
  return out;
}

function MapTable({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const rows = toRows(value);

  function setRows(next: Row[]) {
    onChange(fromRows(next));
  }

  function updateRow(i: number, patch: Partial<Row>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setRows(next);
  }

  function addRow() {
    setRows([...rows, { key: "", value: "" }]);
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next.length ? next : [{ key: "", value: "" }]);
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[8rem] flex-1"
              placeholder="Yaadro status"
              value={row.key}
              onChange={(e) => updateRow(i, { key: e.target.value })}
            />
            <span className="text-muted-foreground">→</span>
            <Input
              className="min-w-[8rem] flex-1"
              placeholder="POS code / label"
              value={row.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => removeRow(i)}
              aria-label="Remove row"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <PlusIcon className="size-3.5" />
        Add mapping row
      </Button>
    </div>
  );
}

export function PosStatusMapsEditor({
  value,
  onChange,
}: {
  value: {
    outbound: Record<string, string>;
    inbound: Record<string, string>;
    export: Record<string, string>;
  };
  onChange: (next: {
    outbound: Record<string, string>;
    inbound: Record<string, string>;
    export: Record<string, string>;
  }) => void;
}) {
  return (
    <div className="space-y-6">
      <MapTable
        title="Outbound (Yaadro → POS)"
        hint="Reserved for future use. For Lane C status push today, use 5. Mappings → Status sent to POS or a value map on order_status."
        value={value.outbound}
        onChange={(outbound) => onChange({ ...value, outbound })}
      />
      <MapTable
        title="Inbound (POS → Yaadro)"
        hint="Used by Saleculator-style status POST. Map the vendor status code to our status name."
        value={value.inbound}
        onChange={(inbound) => onChange({ ...value, inbound })}
      />
      <MapTable
        title="Export (optional)"
        hint="Extra export codes if the vendor uses a separate export format."
        value={value.export}
        onChange={(exportMap) => onChange({ ...value, export: exportMap })}
      />
    </div>
  );
}
