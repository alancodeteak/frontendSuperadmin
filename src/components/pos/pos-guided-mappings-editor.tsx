"use client";

import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PosCapabilities } from "@/lib/pos/contract";

type MappingRecord = Record<string, unknown>;
type RuleRecord = Record<string, unknown>;

type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
};

type ArrayDef = {
  key: string;
  label: string;
  defaultPath: string;
  fields: FieldDef[];
};

type SectionDef = {
  id: string;
  label: string;
  direction: "inbound" | "outbound";
  summary: string;
  when: string;
  enabled: (capabilities: PosCapabilities) => boolean;
  fields: FieldDef[];
  arrays?: ArrayDef[];
  vendorTargets?: boolean;
};

const OUTBOUND_ORDER_SOURCES: FieldDef[] = [
  { key: "order_id", label: "Yaadro order ID" },
  { key: "shop_id", label: "Shop ID" },
  { key: "client_order_ref", label: "Customer order reference", required: true },
  { key: "bill_no", label: "Bill number" },
  { key: "order_status", label: "Order status" },
  { key: "customer_name", label: "Customer name" },
  { key: "customer_phone", label: "Customer phone" },
  { key: "address", label: "Delivery address" },
  { key: "total_amount", label: "Total amount" },
  { key: "vat", label: "VAT" },
  { key: "tip", label: "Tip" },
  { key: "delivery_charge", label: "Delivery charge" },
  { key: "discount_amount", label: "Discount" },
  { key: "cutlery", label: "Cutlery requested" },
  { key: "payment_mode", label: "Payment mode" },
  { key: "payment_status", label: "Payment status" },
  { key: "special_instructions", label: "Special instructions" },
  { key: "order_at", label: "Order time" },
  { key: "action", label: "Outbound action" },
];

const ORDER_ITEM_SOURCES: FieldDef[] = [
  { key: "item_name", label: "Item name", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "price", label: "Unit price", required: true },
  { key: "totalamount", label: "Line total" },
  { key: "pos_product_id", label: "POS product ID" },
  { key: "product_id", label: "Yaadro product ID" },
  { key: "line_kind", label: "Line kind" },
  { key: "parent_item_id", label: "Parent item ID" },
  { key: "option_group_id", label: "Option group ID" },
];

const ORDER_INBOUND_FIELDS: FieldDef[] = [
  { key: "bill_no", label: "Bill / external order ID", required: true },
  { key: "customer_name", label: "Customer name" },
  { key: "customer_phone", label: "Customer phone" },
  { key: "address", label: "Delivery address" },
  { key: "total_amount", label: "Total amount" },
  { key: "payment_mode", label: "Payment mode" },
  { key: "order_status", label: "Order status" },
  { key: "special_instructions", label: "Special instructions" },
  { key: "cutlery", label: "Cutlery requested" },
];

const ORDER_INBOUND_ITEMS: FieldDef[] = [
  { key: "item_name", label: "Item name", required: true },
  { key: "item_name_alt", label: "Alternative item name" },
  { key: "quantity", label: "Quantity", required: true },
  { key: "price", label: "Unit price", required: true },
  { key: "totalamount", label: "Line total" },
  { key: "pos_product_id", label: "POS product ID" },
  { key: "pos_category_id", label: "POS category ID" },
  { key: "vat", label: "VAT amount" },
  { key: "vat_rate", label: "VAT rate" },
  { key: "diet_type", label: "Diet type" },
];

const CATEGORY_FIELDS: FieldDef[] = [
  { key: "name", label: "Category name", required: true },
  { key: "pos_category_id", label: "POS category ID", required: true },
];

const PRODUCT_FIELDS: FieldDef[] = [
  { key: "name", label: "Product name", required: true },
  { key: "plu", label: "PLU / POS product ID", required: true },
  { key: "price", label: "Price", required: true },
  { key: "pos_category_id", label: "POS category ID", required: true },
  { key: "product_type", label: "Product type" },
  { key: "diet_type", label: "Diet type" },
];

const RIDER_FIELDS: FieldDef[] = [
  { key: "code", label: "Rider code", required: true },
  { key: "name", label: "Rider name", required: true },
  { key: "phone", label: "Phone number" },
];

const SECTIONS: SectionDef[] = [
  {
    id: "order_outbound",
    label: "Order sent to POS",
    direction: "outbound",
    summary: "Build the request body expected by the vendor when Yaadro pushes an order.",
    when: "Required when Capabilities → Orders out is push.",
    enabled: (c) => c.orders_out === "push",
    fields: OUTBOUND_ORDER_SOURCES,
    arrays: [
      {
        key: "lines",
        label: "Vendor line-items array",
        defaultPath: "items",
        fields: ORDER_ITEM_SOURCES,
      },
    ],
    vendorTargets: true,
  },
  {
    id: "order_inbound",
    label: "Order received from POS",
    direction: "inbound",
    summary: "Translate a vendor webhook body into Yaadro order fields.",
    when: "Required when Capabilities → Orders in is webhook.",
    enabled: (c) => c.orders_in === "webhook",
    fields: ORDER_INBOUND_FIELDS,
    arrays: [
      {
        key: "items",
        label: "Order items",
        defaultPath: "items",
        fields: ORDER_INBOUND_ITEMS,
      },
    ],
  },
  {
    id: "status_outbound",
    label: "Status sent to POS",
    direction: "outbound",
    summary: "Build the request body sent when Yaadro pushes an order-status change.",
    when: "Required when Capabilities → Status out is push.",
    enabled: (c) => c.status_out === "push",
    fields: OUTBOUND_ORDER_SOURCES,
    vendorTargets: true,
  },
  {
    id: "catalog_sync",
    label: "Combined category + product response",
    direction: "inbound",
    summary: "Translate one combined POS menu response into Yaadro categories and products.",
    when: "Use when Capabilities → Catalog is pull_combined.",
    enabled: (c) => c.catalog === "pull_combined",
    fields: [],
    arrays: [
      { key: "categories", label: "Categories array", defaultPath: "categories", fields: CATEGORY_FIELDS },
      { key: "products", label: "Products array", defaultPath: "products", fields: PRODUCT_FIELDS },
    ],
  },
  {
    id: "catalog_categories",
    label: "Category response",
    direction: "inbound",
    summary: "Translate the separate POS categories response into Yaadro categories.",
    when: "Use when Capabilities → Catalog is pull_split.",
    enabled: (c) => c.catalog === "pull_split",
    fields: [],
    arrays: [
      { key: "categories", label: "Categories array", defaultPath: "categories", fields: CATEGORY_FIELDS },
    ],
  },
  {
    id: "catalog_products",
    label: "Product response",
    direction: "inbound",
    summary: "Translate the separate POS products response into Yaadro products.",
    when: "Use when Capabilities → Catalog is pull_split.",
    enabled: (c) => c.catalog === "pull_split",
    fields: [],
    arrays: [
      { key: "products", label: "Products array", defaultPath: "products", fields: PRODUCT_FIELDS },
    ],
  },
  {
    id: "rider_inbound",
    label: "Riders received from POS",
    direction: "inbound",
    summary: "Translate a POS rider list into Yaadro rider code, name, and phone fields.",
    when: "Required when Capabilities → Riders is inbound.",
    enabled: (c) => c.riders === "inbound",
    fields: [],
    arrays: [
      { key: "riders", label: "Riders array", defaultPath: "riders", fields: RIDER_FIELDS },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNestedObjectRule(value: unknown): value is Record<string, RuleRecord> {
  if (!isRecord(value)) return false;
  if (
    Array.isArray(value.paths) ||
    Array.isArray(value.concat) ||
    typeof value.array_path === "string" ||
    value.default !== undefined
  ) {
    return false;
  }
  return Object.values(value).some(isRecord);
}

function pathsFromRule(rule: unknown): string {
  return isRecord(rule) && Array.isArray(rule.paths) ? rule.paths.map(String).join(", ") : "";
}

function concatFromRule(rule: unknown): string {
  return isRecord(rule) && Array.isArray(rule.concat) ? rule.concat.map(String).join(", ") : "";
}

function parseList(raw: string): string[] {
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function parseDefault(raw: string): unknown {
  const value = raw.trim();
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && value !== "" ? numberValue : value;
}

function flattenPaths(value: unknown, prefix = "", out = new Set<string>()): string[] {
  if (Array.isArray(value)) {
    if (prefix) out.add(prefix);
    if (value[0] !== undefined) flattenPaths(value[0], prefix, out);
    return [...out];
  }
  if (!isRecord(value)) {
    if (prefix) out.add(prefix);
    return [...out];
  }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      out.add(path);
      if (child[0] !== undefined) flattenPaths(child[0], path, out);
    } else if (isRecord(child)) {
      flattenPaths(child, path, out);
    } else {
      out.add(path);
    }
  }
  return [...out];
}

function valueAtPath(value: unknown, path: string): unknown {
  let cursor = value;
  for (const segment of path.split(".").filter(Boolean)) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function fieldLabel(def: SectionDef, key: string): string {
  return def.fields.find((field) => field.key === key)?.label ?? key;
}

function RuleEditor({
  rule,
  sourceOptions,
  sourceLabel,
  onChange,
}: {
  rule: RuleRecord;
  sourceOptions: string[];
  sourceLabel: string;
  onChange: (next: RuleRecord) => void;
}) {
  const inputId = useId();
  const mode = Array.isArray(rule.concat) ? "join" : "path";
  const source = mode === "join" ? concatFromRule(rule) : pathsFromRule(rule);
  const listId = `mapping-paths-${inputId.replace(/:/g, "")}`;

  function patch(patchValue: RuleRecord) {
    onChange({ ...rule, ...patchValue });
  }

  return (
    <div className="grid gap-3 md:grid-cols-[7rem_minmax(12rem,1fr)_8rem_7rem]">
      <select
        className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
        value={mode}
        onChange={(event) => {
          const next = { ...rule };
          delete next.paths;
          delete next.concat;
          if (event.target.value === "join") next.concat = source ? parseList(source) : [];
          else next.paths = source ? parseList(source) : [];
          onChange(next);
        }}
        aria-label="Mapping method"
      >
        <option value="path">Find field</option>
        <option value="join">Join fields</option>
      </select>
      <div>
        <Input
          list={listId}
          value={source}
          onChange={(event) =>
            patch(
              mode === "join"
                ? { concat: parseList(event.target.value) }
                : { paths: parseList(event.target.value) },
            )
          }
          placeholder={sourceLabel}
          className="font-mono text-xs"
        />
        <datalist id={listId}>
          {sourceOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {mode === "join"
            ? "Enter multiple paths separated by commas."
            : "Add fallback paths with commas; the first value found is used."}
        </p>
      </div>
      <Input
        value={rule.default === undefined ? "" : String(rule.default)}
        onChange={(event) => {
          const next = { ...rule };
          const parsed = parseDefault(event.target.value);
          if (parsed === undefined) delete next.default;
          else next.default = parsed;
          onChange(next);
        }}
        placeholder="Default"
        className="text-xs"
        aria-label="Default value"
      />
      <label className="flex h-9 items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={rule.optional === true}
          onChange={(event) => patch({ optional: event.target.checked })}
        />
        Optional
      </label>
    </div>
  );
}

function GuidedSection({
  definition,
  mapping,
  sample,
  onSampleChange,
  onChange,
}: {
  definition: SectionDef;
  mapping: MappingRecord;
  sample: string;
  onSampleChange: (value: string) => void;
  onChange: (next: MappingRecord) => void;
}) {
  const [sampleError, setSampleError] = useState<string | null>(null);
  const parsedSample = useMemo(() => {
    if (!sample.trim()) return undefined;
    try {
      const parsed: unknown = JSON.parse(sample);
      if (!isRecord(parsed)) return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  }, [sample]);
  const samplePaths = useMemo(() => flattenPaths(parsedSample), [parsedSample]);
  const configuredArrayEntries = Object.entries(mapping).filter(
    ([, value]) => isRecord(value) && typeof value.array_path === "string" && isRecord(value.item),
  );
  const configuredArrayKeys = new Set(configuredArrayEntries.map(([key]) => key));
  const arrayDefinitions = [
    ...(definition.arrays ?? []).filter(
      (array) =>
        !definition.vendorTargets ||
        configuredArrayKeys.size === 0 ||
        configuredArrayKeys.has(array.key),
    ),
    ...configuredArrayEntries
      .filter(([key]) => !(definition.arrays ?? []).some((array) => array.key === key))
      .map(([key]) => ({
        key,
        label: key,
        defaultPath: definition.direction === "outbound" ? "items" : key,
        fields: definition.arrays?.[0]?.fields ?? [],
      })),
  ];
  const arrayKeys = new Set(arrayDefinitions.map((array) => array.key));
  const scalarEntries = Object.entries(mapping).filter(([key, value]) => {
    if (arrayKeys.has(key)) return false;
    return isRecord(value) && !isNestedObjectRule(value);
  });
  const objectEntries = Object.entries(mapping).filter(
    ([key, value]) => !arrayKeys.has(key) && isNestedObjectRule(value),
  );
  const missingRecommended = definition.vendorTargets
    ? []
    : definition.fields.filter((field) => !isRecord(mapping[field.key]));

  function setRule(key: string, rule: RuleRecord) {
    onChange({ ...mapping, [key]: rule });
  }

  function removeRule(key: string) {
    const next = { ...mapping };
    delete next[key];
    onChange(next);
  }

  function renameRule(oldKey: string, newKeyRaw: string) {
    const newKey = newKeyRaw.trim();
    if (!newKey || newKey === oldKey || mapping[newKey] !== undefined) return;
    const next: MappingRecord = {};
    for (const [key, value] of Object.entries(mapping)) {
      next[key === oldKey ? newKey : key] = value;
    }
    onChange(next);
  }

  function addField(key?: string) {
    let candidate = key?.trim() || (definition.vendorTargets ? "vendor_field" : "custom_field");
    let suffix = 2;
    while (mapping[candidate] !== undefined) candidate = `${key ?? "custom_field"}_${suffix++}`;
    const source = definition.vendorTargets && key ? key : "";
    onChange({ ...mapping, [candidate]: source ? { paths: [source] } : { paths: [] } });
  }

  function addArray() {
    let candidate = definition.vendorTargets ? "VendorItems" : "custom_array";
    let suffix = 2;
    while (mapping[candidate] !== undefined) candidate = `${definition.vendorTargets ? "VendorItems" : "custom_array"}_${suffix++}`;
    onChange({
      ...mapping,
      [candidate]: {
        array_path: definition.direction === "outbound" ? "items" : "data.items",
        item: {},
      },
    });
  }

  function addObject() {
    let candidate = definition.vendorTargets ? "VendorObject" : "custom_object";
    let suffix = 2;
    while (mapping[candidate] !== undefined) candidate = `${definition.vendorTargets ? "VendorObject" : "custom_object"}_${suffix++}`;
    onChange({ ...mapping, [candidate]: { Field: { paths: [] } } });
  }

  function addSuggestedFields() {
    if (!parsedSample) {
      setSampleError("Paste a valid vendor JSON object first.");
      return;
    }
    const next = { ...mapping };
    if (definition.direction === "outbound") {
      for (const [key, value] of Object.entries(parsedSample)) {
        if (next[key] !== undefined) continue;
        if (Array.isArray(value)) {
          const first = isRecord(value[0]) ? value[0] : {};
          const item: MappingRecord = {};
          for (const itemKey of Object.keys(first)) item[itemKey] = { paths: [] };
          next[key] = { array_path: "items", item };
        } else if (isRecord(value)) {
          const children: MappingRecord = {};
          for (const childKey of Object.keys(value)) children[childKey] = { paths: [] };
          next[key] = children;
        } else {
          next[key] = { paths: [] };
        }
      }
    }
    onChange(next);
    setSampleError(null);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/20">
        <p className="font-medium">How this mapping works</p>
        <p className="mt-1 text-muted-foreground">{definition.summary}</p>
        <p className="mt-2 text-xs font-medium">{definition.when}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {definition.direction === "inbound"
            ? "Yaadro field (left) ← vendor JSON path (right)."
            : "Vendor body field (left) ← Yaadro source field (right)."}
        </p>
      </div>

      <div className="rounded-xl border border-border/80 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {definition.direction === "inbound"
                ? "1. Paste a real response/webhook sample"
                : "1. Paste the body example required by the vendor"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This sample is used only to suggest fields; it is not saved with the template.
            </p>
          </div>
          {definition.direction === "outbound" ? (
            <Button type="button" size="sm" variant="outline" onClick={addSuggestedFields}>
              Add body fields from sample
            </Button>
          ) : null}
        </div>
        <Textarea
          className="mt-3 min-h-28 font-mono text-xs"
          value={sample}
          onChange={(event) => {
            onSampleChange(event.target.value);
            setSampleError(null);
          }}
          placeholder='{"data":{"id":"POS-100","items":[...]}}'
        />
        {sample.trim() && !parsedSample ? (
          <p className="mt-2 text-xs text-destructive">Sample must be a valid JSON object.</p>
        ) : null}
        {sampleError ? <p className="mt-2 text-xs text-destructive">{sampleError}</p> : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">2. Map body fields</p>
            <p className="text-xs text-muted-foreground">
              Select a suggestion or type a dotted path such as data.customer.name.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingRecommended.length ? (
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                value=""
                onChange={(event) => event.target.value && addField(event.target.value)}
              >
                <option value="">+ Add Yaadro field</option>
                {missingRecommended.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}{field.required ? " (required)" : ""}
                  </option>
                ))}
              </select>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => addField()}>
              + Add custom field
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addArray}>
              + Add array
            </Button>
            {definition.vendorTargets ? (
              <Button type="button" size="sm" variant="outline" onClick={addObject}>
                + Add object group
              </Button>
            ) : null}
          </div>
        </div>

        {scalarEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            No fields yet. Add a field above or paste a vendor example.
          </div>
        ) : (
          scalarEntries.map(([key, value]) => {
            const rule = isRecord(value) ? value : {};
            const known = definition.fields.find((field) => field.key === key);
            const sourceOptions = definition.direction === "inbound"
              ? samplePaths
              : definition.fields.map((field) => field.key);
            return (
              <div key={key} className="rounded-xl border border-border/80 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {definition.vendorTargets || !known ? (
                      <Input
                        defaultValue={key}
                        onBlur={(event) => renameRule(key, event.target.value)}
                        className="max-w-64 font-mono text-xs"
                        aria-label="Target field name"
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {fieldLabel(definition, key)}
                        {known.required ? <span className="ml-1 text-destructive">*</span> : null}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {definition.direction === "inbound" ? "← vendor" : "← Yaadro"}
                    </span>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeRule(key)}>
                    Remove
                  </Button>
                </div>
                <RuleEditor
                  rule={rule}
                  sourceOptions={sourceOptions}
                  sourceLabel={
                    definition.direction === "inbound"
                      ? "Vendor path, e.g. data.order_no"
                      : "Yaadro field, e.g. client_order_ref"
                  }
                  onChange={(next) => setRule(key, next)}
                />
              </div>
            );
          })
        )}
      </div>

      {objectEntries.map(([objectKey, objectValue]) => {
        const children = objectValue as Record<string, RuleRecord>;

        function patchObject(nextChildren: Record<string, RuleRecord>) {
          onChange({ ...mapping, [objectKey]: nextChildren });
        }

        function renameObject(newKeyRaw: string) {
          const newKey = newKeyRaw.trim();
          if (!newKey || newKey === objectKey || mapping[newKey] !== undefined) return;
          const next = { ...mapping };
          delete next[objectKey];
          next[newKey] = children;
          onChange(next);
        }

        function addChild() {
          let candidate = "Field";
          let suffix = 2;
          while (children[candidate] !== undefined) candidate = `Field${suffix++}`;
          patchObject({ ...children, [candidate]: { paths: [] } });
        }

        return (
          <div key={objectKey} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={objectKey}
                  onBlur={(event) => renameObject(event.target.value)}
                  className="max-w-64 font-mono text-xs"
                  aria-label="Vendor object field name"
                />
                <span className="text-xs text-muted-foreground">vendor object group {"{}"}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addChild}>
                  + Add nested field
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeRule(objectKey)}>
                  Remove group
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-3 border-l-2 border-muted pl-3">
              {Object.entries(children).map(([childKey, childRule]) => (
                <div key={childKey} className="rounded-lg bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Input
                      defaultValue={childKey}
                      onBlur={(event) => {
                        const nextKey = event.target.value.trim();
                        if (!nextKey || nextKey === childKey || children[nextKey] !== undefined) return;
                        const nextChildren = { ...children };
                        delete nextChildren[childKey];
                        nextChildren[nextKey] = childRule;
                        patchObject(nextChildren);
                      }}
                      className="max-w-64 font-mono text-xs"
                      aria-label="Nested vendor field name"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const nextChildren = { ...children };
                        delete nextChildren[childKey];
                        if (Object.keys(nextChildren).length === 0) removeRule(objectKey);
                        else patchObject(nextChildren);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  <RuleEditor
                    rule={isRecord(childRule) ? childRule : {}}
                    sourceOptions={definition.fields.map((field) => field.key)}
                    sourceLabel="Yaadro source field"
                    onChange={(next) => patchObject({ ...children, [childKey]: next })}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {arrayDefinitions.map((arrayDef) => {
        const arrayRule = isRecord(mapping[arrayDef.key]) ? mapping[arrayDef.key] as RuleRecord : {};
        const itemRules = isRecord(arrayRule.item) ? arrayRule.item as MappingRecord : {};
        const arrayPath =
          typeof arrayRule.array_path === "string" ? arrayRule.array_path : arrayDef.defaultPath;
        const itemSource = definition.direction === "inbound"
          ? valueAtPath(parsedSample, arrayPath)
          : undefined;
        const itemSample = Array.isArray(itemSource) ? itemSource[0] : undefined;
        const itemPaths = definition.direction === "inbound"
          ? flattenPaths(itemSample)
          : arrayDef.fields.map((field) => field.key);
        const missingItems = arrayDef.fields.filter((field) => !isRecord(itemRules[field.key]));

        function patchArray(nextRule: RuleRecord) {
          onChange({ ...mapping, [arrayDef.key]: nextRule });
        }

        function renameArray(newKeyRaw: string) {
          const newKey = newKeyRaw.trim();
          if (!newKey || newKey === arrayDef.key || mapping[newKey] !== undefined) return;
          const next = { ...mapping };
          delete next[arrayDef.key];
          next[newKey] = {
            ...arrayRule,
            array_path: arrayPath,
            item: itemRules,
          };
          onChange(next);
        }

        function patchItem(key: string, rule: RuleRecord) {
          patchArray({ ...arrayRule, array_path: arrayPath, item: { ...itemRules, [key]: rule } });
        }

        function addItemField(key?: string) {
          let candidate = key || (definition.vendorTargets ? "VendorItemField" : "custom_item_field");
          let suffix = 2;
          while (itemRules[candidate] !== undefined) candidate = `${key ?? "custom_item_field"}_${suffix++}`;
          const source = definition.vendorTargets && key ? key : "";
          patchItem(candidate, source ? { paths: [source] } : { paths: [] });
        }

        return (
          <div key={arrayDef.key} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {definition.vendorTargets ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">3.</span>
                    <Input
                      defaultValue={arrayDef.key}
                      onBlur={(event) => renameArray(event.target.value)}
                      className="max-w-64 font-mono text-xs"
                      aria-label="Vendor array field name"
                    />
                    <span className="text-xs text-muted-foreground">vendor array field</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium">3. {arrayDef.label}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose the array path, then map fields inside each row.
                </p>
              </div>
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                value=""
                onChange={(event) => event.target.value && addItemField(event.target.value)}
              >
                <option value="">+ Add item field</option>
                {missingItems.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}{field.required ? " (required)" : ""}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeRule(arrayDef.key)}>
                Remove array
              </Button>
            </div>
            <div className="mt-3 max-w-xl space-y-1">
              <Label className="text-xs">
                {definition.direction === "inbound" ? "Vendor array path" : "Yaadro array source"}
              </Label>
              <Input
                list={`array-path-${definition.id}-${arrayDef.key}`}
                value={arrayPath}
                onChange={(event) =>
                  patchArray({ ...arrayRule, array_path: event.target.value, item: itemRules })
                }
                className="font-mono text-xs"
              />
              <datalist id={`array-path-${definition.id}-${arrayDef.key}`}>
                {samplePaths.map((path) => <option key={path} value={path} />)}
              </datalist>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(itemRules).map(([key, value]) => {
                if (!isRecord(value)) return null;
                const known = arrayDef.fields.find((field) => field.key === key);
                return (
                  <div key={key} className="rounded-lg bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {definition.vendorTargets || !known ? (
                        <Input
                          defaultValue={key}
                          onBlur={(event) => {
                            const nextKey = event.target.value.trim();
                            if (!nextKey || nextKey === key || itemRules[nextKey] !== undefined) return;
                            const nextItems = { ...itemRules };
                            delete nextItems[key];
                            nextItems[nextKey] = value;
                            patchArray({ ...arrayRule, array_path: arrayPath, item: nextItems });
                          }}
                          className="max-w-64 font-mono text-xs"
                        />
                      ) : (
                        <p className="text-xs font-medium">
                          {known.label}{known.required ? <span className="ml-1 text-destructive">*</span> : null}
                        </p>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const nextItems = { ...itemRules };
                          delete nextItems[key];
                          patchArray({ ...arrayRule, array_path: arrayPath, item: nextItems });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <RuleEditor
                      rule={value}
                      sourceOptions={itemPaths}
                      sourceLabel={
                        definition.direction === "inbound"
                          ? "Field inside vendor array item"
                          : "Field inside Yaadro items"
                      }
                      onChange={(next) => patchItem(key, next)}
                    />
                  </div>
                );
              })}
              {Object.keys(itemRules).length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Add the required item fields above.
                </p>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Before saving:</span>{" "}
        open <strong>7. Test map</strong>, select <code>{definition.id}</code>,{" "}
        {definition.direction === "inbound"
          ? "paste the same vendor sample"
          : "load the Yaadro canonical-order sample"}{" "}
        and confirm the generated output contains all required fields.
      </div>
    </div>
  );
}

export function PosGuidedMappingsEditor({
  capabilities,
  mappings,
  onChange,
}: {
  capabilities: PosCapabilities;
  mappings: MappingRecord;
  onChange: (next: MappingRecord) => void;
}) {
  const firstEnabled = SECTIONS.find((section) => section.enabled(capabilities))?.id ?? "order_inbound";
  const [active, setActive] = useState(firstEnabled);
  const [samples, setSamples] = useState<Record<string, string>>({});
  const definition = SECTIONS.find((section) => section.id === active) ?? SECTIONS[0]!;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">Choose what you want to map</p>
        <p className="mt-1 text-xs text-muted-foreground">
          “Required now” is calculated from the Capabilities tab. Configure only the flows the vendor supports.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const enabled = section.enabled(capabilities);
          const configured = isRecord(mappings[section.id]) && Object.keys(mappings[section.id] as object).length > 0;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active === section.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <span className="block text-sm font-medium">{section.label}</span>
              <span className={`mt-1 block text-[10px] font-medium ${
                enabled ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
              }`}>
                {enabled ? "Relevant with current capabilities" : "Not needed with current capabilities"}
                {configured ? " · Configured" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <GuidedSection
        definition={definition}
        mapping={isRecord(mappings[definition.id]) ? mappings[definition.id] as MappingRecord : {}}
        sample={samples[definition.id] ?? ""}
        onSampleChange={(sample) => setSamples((current) => ({ ...current, [definition.id]: sample }))}
        onChange={(sectionMapping) => onChange({ ...mappings, [definition.id]: sectionMapping })}
      />
    </div>
  );
}
