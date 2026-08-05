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
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.value.trim();
  }
  return out;
}

export function PosValueMapsEditor({
  value,
  onChange,
}: {
  value: Record<string, Record<string, string>>;
  onChange: (next: Record<string, Record<string, string>>) => void;
}) {
  const mapNames = Object.keys(value);
  const names = mapNames.length ? mapNames : [""];

  function setMapName(oldName: string, newNameRaw: string) {
    const newName = newNameRaw.trim();
    if (!newName || newName === oldName || value[newName] !== undefined) return;
    const next = { ...value };
    next[newName] = next[oldName] ?? {};
    delete next[oldName];
    onChange(next);
  }

  function updateMap(name: string, rows: Record<string, string>) {
    onChange({ ...value, [name]: rows });
  }

  function addMap() {
    let candidate = "diet_type";
    let suffix = 2;
    while (value[candidate] !== undefined) candidate = `value_map_${suffix++}`;
    onChange({ ...value, [candidate]: {} });
  }

  function removeMap(name: string) {
    const next = { ...value };
    delete next[name];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        Use named value maps when a vendor sends coded values (for example{" "}
        <code>vegFlag: &quot;1&quot;</code>) and Yaadro needs a translated string. Reference
        them from a mapping field with <strong>Value map name</strong> ={" "}
        <code>diet_type</code>.
      </div>
      {names.map((name) => {
        const map = name ? (value[name] ?? {}) : {};
        const rows = toRows(map);
        return (
          <div key={name || "new-map"} className="rounded-xl border border-border/80 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Label className="text-xs text-muted-foreground">Map name</Label>
              <Input
                className="max-w-xs font-mono text-xs"
                value={name}
                placeholder="diet_type"
                onChange={(event) => {
                  if (!name) {
                    const nextName = event.target.value.trim();
                    if (!nextName) return;
                    onChange({ ...value, [nextName]: {} });
                    return;
                  }
                  setMapName(name, event.target.value);
                }}
              />
              {name ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => removeMap(name)}>
                  Remove map
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-[7rem] flex-1 font-mono text-xs"
                    placeholder="Vendor value"
                    value={row.key}
                    onChange={(event) => {
                      const nextRows = rows.map((entry, idx) =>
                        idx === index ? { ...entry, key: event.target.value } : entry,
                      );
                      updateMap(name, fromRows(nextRows));
                    }}
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    className="min-w-[7rem] flex-1 text-xs"
                    placeholder="Yaadro value"
                    value={row.value}
                    onChange={(event) => {
                      const nextRows = rows.map((entry, idx) =>
                        idx === index ? { ...entry, value: event.target.value } : entry,
                      );
                      updateMap(name, fromRows(nextRows));
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => {
                      const nextRows = rows.filter((_, idx) => idx !== index);
                      updateMap(name, fromRows(nextRows.length ? nextRows : [{ key: "", value: "" }]));
                    }}
                    aria-label="Remove row"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => updateMap(name, fromRows([...rows, { key: "", value: "" }]))}
            >
              <PlusIcon className="size-3.5" />
              Add translation row
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={addMap}>
        <PlusIcon className="size-3.5" />
        Add value map
      </Button>
    </div>
  );
}
