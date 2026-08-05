"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Common order_inbound fields from starter mapping — edit paths as comma-separated. */
const ORDER_INBOUND_FIELDS: {
  key: string;
  label: string;
  hint: string;
  kind: "paths" | "concat" | "items";
}[] = [
  {
    key: "bill_no",
    label: "Bill / order ID",
    hint: "Vendor field for external order id",
    kind: "paths",
  },
  {
    key: "customer_name",
    label: "Customer name",
    hint: "e.g. customer.name, cust_name",
    kind: "paths",
  },
  {
    key: "customer_phone",
    label: "Customer phone",
    hint: "e.g. customer.phone",
    kind: "paths",
  },
  {
    key: "address",
    label: "Delivery address",
    hint: "Fields to join with comma (addr1, addr2)",
    kind: "concat",
  },
  {
    key: "total_amount",
    label: "Total amount",
    hint: "e.g. total, grand_total",
    kind: "paths",
  },
  {
    key: "payment_mode",
    label: "Payment mode",
    hint: "e.g. pay_mode, payment_mode",
    kind: "paths",
  },
];

const ITEM_SUBFIELDS = [
  { key: "item_name", label: "Item name paths" },
  { key: "quantity", label: "Quantity paths" },
  { key: "price", label: "Unit price paths" },
  { key: "totalamount", label: "Line total paths" },
] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function readPaths(rule: unknown): string {
  if (!isRecord(rule)) return "";
  const paths = rule.paths;
  if (!Array.isArray(paths)) return "";
  return paths.map(String).join(", ");
}

function readConcat(rule: unknown): string {
  if (!isRecord(rule)) return "";
  const concat = rule.concat;
  if (!Array.isArray(concat)) return "";
  return concat.map(String).join(", ");
}

function writePaths(pathsCsv: string): Record<string, unknown> {
  const paths = pathsCsv
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return paths.length ? { paths } : {};
}

function writeConcat(fieldsCsv: string): Record<string, unknown> {
  const concat = fieldsCsv
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return concat.length ? { concat, separator: ", " } : {};
}

export function PosOrderInboundFieldsEditor({
  mapping,
  onChange,
}: {
  mapping: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const itemsRule = isRecord(mapping.items) ? mapping.items : {};
  const itemSub = isRecord(itemsRule.item) ? itemsRule.item : {};
  const arrayPath = typeof itemsRule.array_path === "string" ? itemsRule.array_path : "items";

  function patchField(key: string, kind: "paths" | "concat", raw: string) {
    const next = { ...mapping };
    const rule = kind === "concat" ? writeConcat(raw) : writePaths(raw);
    if (Object.keys(rule).length === 0) delete next[key];
    else next[key] = rule;
    onChange(next);
  }

  function patchItems(patch: {
    array_path?: string;
    item?: Record<string, unknown>;
  }) {
    const nextItems: Record<string, unknown> = { ...itemsRule, ...patch };
    if (patch.item) nextItems.item = patch.item;
    onChange({ ...mapping, items: nextItems });
  }

  function patchItemSub(key: string, pathsCsv: string) {
    const rule = writePaths(pathsCsv);
    const nextItem = { ...itemSub };
    if (Object.keys(rule).length === 0) delete nextItem[key];
    else nextItem[key] = rule;
    patchItems({ item: nextItem });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map vendor webhook JSON to Yaadro order fields. Enter comma-separated
        JSON paths (try left-to-right until one matches). Use Advanced mapping
        JSON for unusual shapes.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {ORDER_INBOUND_FIELDS.map((field) => {
          if (field.kind === "items") return null;
          return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium">{field.label}</Label>
            <Input
              value={
                field.kind === "concat"
                  ? readConcat(mapping[field.key])
                  : readPaths(mapping[field.key])
              }
              onChange={(e) => {
                if (field.kind === "items") return;
                patchField(field.key, field.kind, e.target.value);
              }}
              placeholder={field.hint}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">{field.hint}</p>
          </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
        <p className="mb-3 text-sm font-medium">Line items (items[])</p>
        <div className="mb-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Array path</Label>
          <Input
            value={arrayPath}
            onChange={(e) => patchItems({ array_path: e.target.value })}
            placeholder="items"
            className="font-mono text-xs"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ITEM_SUBFIELDS.map((sub) => (
            <div key={sub.key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{sub.label}</Label>
              <Input
                value={readPaths(itemSub[sub.key])}
                onChange={(e) => patchItemSub(sub.key, e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
