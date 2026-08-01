"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const OPERATING_DAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type OperatingDayKey = (typeof OPERATING_DAY_KEYS)[number];

export type OperatingTimeSlot = {
  open: string;
  close: string;
};

export type ShopOperatingHours = Record<OperatingDayKey, OperatingTimeSlot[]>;

const DAY_LABELS: Record<OperatingDayKey, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

function emptyHours(): ShopOperatingHours {
  return {
    sun: [],
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
  };
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // Some browsers emit HH:MM:SS from <input type="time">
  const hhmm = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmed);
  if (!hhmm) return null;
  return `${hhmm[1]}:${hhmm[2]}`;
}

function normalizeSlot(raw: unknown): OperatingTimeSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const open = normalizeTime(row.open);
  const close = normalizeTime(row.close);
  if (!open || !close) return null;
  return { open, close };
}

/** Parse API / legacy values into the sun–sat week payload. */
export function parseOperatingHours(value: unknown): ShopOperatingHours {
  const base = emptyHours();
  if (value == null || value === "") return base;

  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return base;
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const record = raw as Record<string, unknown>;

  // Accept full day names from older payloads (monday → mon)
  const aliases: Record<string, OperatingDayKey> = {
    sunday: "sun",
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
  };

  for (const key of OPERATING_DAY_KEYS) {
    const fullName = Object.entries(aliases).find(([, short]) => short === key)?.[0];
    const dayRaw = record[key] ?? (fullName ? record[fullName] : undefined);
    if (!Array.isArray(dayRaw)) {
      base[key] = [];
      continue;
    }
    base[key] = dayRaw
      .map(normalizeSlot)
      .filter((s): s is OperatingTimeSlot => s != null);
  }

  return base;
}

export function validateOperatingHours(
  hours: ShopOperatingHours,
): string | null {
  for (const day of OPERATING_DAY_KEYS) {
    const slots = hours[day];
    for (let i = 0; i < slots.length; i += 1) {
      const open = normalizeTime(slots[i].open);
      const close = normalizeTime(slots[i].close);
      if (!open || !close) {
        return `${DAY_LABELS[day]}: times must be HH:MM (24-hour)`;
      }
      if (open >= close) {
        return `${DAY_LABELS[day]} slot ${i + 1}: close must be after open`;
      }
    }
  }
  return null;
}

/** Ensure payload uses HH:MM only before PATCH. */
export function serializeOperatingHours(
  hours: ShopOperatingHours,
): ShopOperatingHours {
  const out = emptyHours();
  for (const day of OPERATING_DAY_KEYS) {
    out[day] = hours[day]
      .map((slot) => {
        const open = normalizeTime(slot.open);
        const close = normalizeTime(slot.close);
        if (!open || !close) return null;
        return { open, close };
      })
      .filter((s): s is OperatingTimeSlot => s != null);
  }
  return out;
}

/** Compact read-only summary for view mode. */
export function formatOperatingHoursSummary(value: unknown): string {
  const hours = parseOperatingHours(value);
  const parts = OPERATING_DAY_KEYS.map((day) => {
    const slots = hours[day];
    if (slots.length === 0) return `${DAY_LABELS[day].slice(0, 3)} closed`;
    return `${DAY_LABELS[day].slice(0, 3)} ${slots
      .map((s) => `${s.open}–${s.close}`)
      .join(", ")}`;
  });
  return parts.join(" · ");
}

type OperatingHoursEditorProps = {
  value: ShopOperatingHours;
  onChange: (next: ShopOperatingHours) => void;
  disabled?: boolean;
  error?: string | null;
};

export function OperatingHoursEditor({
  value,
  onChange,
  disabled,
  error,
}: OperatingHoursEditorProps) {
  function updateDay(day: OperatingDayKey, slots: OperatingTimeSlot[]) {
    onChange({ ...value, [day]: slots });
  }

  function setOpen(day: OperatingDayKey, open: boolean) {
    if (open) {
      updateDay(day, value[day].length ? value[day] : [{ open: "09:00", close: "22:00" }]);
    } else {
      updateDay(day, []);
    }
  }

  function setSlot(
    day: OperatingDayKey,
    index: number,
    patch: Partial<OperatingTimeSlot>,
  ) {
    updateDay(
      day,
      value[day].map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  function addSlot(day: OperatingDayKey) {
    updateDay(day, [...value[day], { open: "16:00", close: "22:00" }]);
  }

  function removeSlot(day: OperatingDayKey, index: number) {
    const next = value[day].filter((_, i) => i !== index);
    updateDay(day, next);
  }

  return (
    <div
      data-field="operating_hours"
      className={cn(
        "space-y-3 rounded-xl border bg-card p-3",
        error && "border-destructive/40",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Operating hours
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Empty day = closed. Times use 24-hour HH:MM.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {OPERATING_DAY_KEYS.map((day) => {
          const slots = value[day];
          const isOpen = slots.length > 0;
          return (
            <div
              key={day}
              className="rounded-lg border border-border/70 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium">
                    {DAY_LABELS[day]}
                  </span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={isOpen}
                      disabled={disabled}
                      onChange={(e) => setOpen(day, e.target.checked)}
                    />
                    Open
                  </label>
                </div>
                {isOpen ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => addSlot(day)}
                  >
                    <PlusIcon className="size-3.5" />
                    Add slot
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>

              {isOpen ? (
                <div className="mt-2 space-y-2">
                  {slots.map((slot, index) => (
                    <div
                      key={`${day}-${index}`}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Open
                        </p>
                        <Input
                          type="time"
                          step={60}
                          value={slot.open}
                          disabled={disabled}
                          className="w-[8.5rem]"
                          onChange={(e) =>
                            setSlot(day, index, {
                              open: normalizeTime(e.target.value) ?? e.target.value.slice(0, 5),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Close
                        </p>
                        <Input
                          type="time"
                          step={60}
                          value={slot.close}
                          disabled={disabled}
                          className="w-[8.5rem]"
                          onChange={(e) =>
                            setSlot(day, index, {
                              close:
                                normalizeTime(e.target.value) ??
                                e.target.value.slice(0, 5),
                            })
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        disabled={disabled || slots.length <= 1}
                        onClick={() => removeSlot(day, index)}
                        aria-label={`Remove ${DAY_LABELS[day]} slot ${index + 1}`}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

/** Read-only week grid for view mode. */
export function OperatingHoursDisplay({ value }: { value: unknown }) {
  const hours = parseOperatingHours(value);
  const hasAny = OPERATING_DAY_KEYS.some((d) => hours[d].length > 0);

  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground">No operating hours set.</p>
    );
  }

  return (
    <div>
      {OPERATING_DAY_KEYS.map((day) => {
        const slots = hours[day];
        return (
          <div
            key={day}
            className="flex items-center gap-4 border-b border-border/70 py-2.5 last:border-b-0"
          >
            <span className="w-40 shrink-0 text-sm text-muted-foreground sm:w-48">
              {DAY_LABELS[day]}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {slots.length === 0
                ? "Closed"
                : slots.map((s) => `${s.open} – ${s.close}`).join(", ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
