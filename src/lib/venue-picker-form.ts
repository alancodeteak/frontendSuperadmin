import type { VenuePickerScope } from "@/types/api";

export const VENUE_PICKER_SCOPE_OPTIONS: {
  value: VenuePickerScope;
  label: string;
}[] = [
  { value: "table", label: "Table" },
  { value: "room", label: "Room" },
  { value: "pickup_counter", label: "Pickup / drive-thru" },
  { value: "all_venue", label: "All venue" },
];

export function formatDiningAreaIds(ids?: number[] | null): string {
  if (!ids?.length) return "";
  return ids.join(", ");
}

/** Returns `[]` for empty input, `null` if invalid. */
export function parseDiningAreaIds(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  const ids: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 1) return null;
    ids.push(n);
  }
  return ids;
}

export function formatVenuePickerScope(scope: string | undefined): string {
  const match = VENUE_PICKER_SCOPE_OPTIONS.find((o) => o.value === scope);
  return match?.label ?? scope ?? "—";
}
