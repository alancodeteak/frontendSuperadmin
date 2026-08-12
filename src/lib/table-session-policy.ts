export type TableSessionPolicyValue =
  | "single_order"
  | "one_active_order"
  | "multi_order";

export const TABLE_SESSION_POLICY_OPTIONS: Array<{
  value: TableSessionPolicyValue;
  label: string;
  description: string;
}> = [
  {
    value: "single_order",
    label: "Single order per table session",
    description: "Block a second order at the same table/room until the current session ends.",
  },
  {
    value: "one_active_order",
    label: "One active order at a time",
    description: "Block while a non-terminal order is bound to the table/room.",
  },
  {
    value: "multi_order",
    label: "Multiple orders (courses / split bills)",
    description: "Allow several open tickets at the same table or room.",
  },
];

export function tableSessionPolicyLabel(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return (
    TABLE_SESSION_POLICY_OPTIONS.find((opt) => opt.value === value)?.label ??
    value
  );
}

export function normalizeTableSessionPolicy(
  value: string | null | undefined,
): TableSessionPolicyValue {
  if (value === "one_active_order" || value === "multi_order") {
    return value;
  }
  return "single_order";
}
