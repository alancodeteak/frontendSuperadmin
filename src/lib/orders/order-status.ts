import type { ShopDeliverySettings } from "@/types/api";

/** Yaadro order_status values used in admin UI. */
export const YAADRO_ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Rejected",
  "customer_not_available",
  "cancelled",
] as const;

export type YaadroOrderStatus = (typeof YAADRO_ORDER_STATUSES)[number];

export function normalizeDeliveryLifecycleFlags(
  delivery?: ShopDeliverySettings | null,
) {
  return {
    preparingStatusEnabled: delivery?.preparing_status_enabled !== false,
    readyStatusEnabled: delivery?.ready_status_enabled !== false,
    pickupDisabled: delivery?.pickup_disabled === true,
  };
}

export function isOrderStatusVisibleForShop(
  status: string,
  delivery?: ShopDeliverySettings | null,
): boolean {
  const flags = normalizeDeliveryLifecycleFlags(delivery);
  switch (status) {
    case "Preparing":
    case "preparing":
      return flags.preparingStatusEnabled;
    case "Ready":
    case "ready":
      return flags.readyStatusEnabled;
    case "Picked Up":
    case "Picked up":
    case "picked_up":
      return !flags.pickupDisabled;
    default:
      return true;
  }
}

/** Filter/select options for a shop's enabled lifecycle statuses. */
export function orderStatusFilterOptions(
  delivery?: ShopDeliverySettings | null,
): Array<{ value: YaadroOrderStatus; label: string }> {
  const flags = normalizeDeliveryLifecycleFlags(delivery);
  const options: Array<{ value: YaadroOrderStatus; label: string }> = [
    { value: "Pending", label: "Pending" },
    { value: "Accepted", label: "Accepted" },
  ];
  if (flags.preparingStatusEnabled) {
    options.push({ value: "Preparing", label: "Preparing" });
  }
  if (flags.readyStatusEnabled) {
    options.push({ value: "Ready", label: "Ready" });
  }
  options.push({ value: "Assigned", label: "Assigned" });
  if (!flags.pickupDisabled) {
    options.push({ value: "Picked Up", label: "Picked Up" });
  }
  options.push(
    { value: "Out for Delivery", label: "Out for Delivery" },
    { value: "Delivered", label: "Delivered" },
    { value: "Rejected", label: "Rejected" },
    { value: "customer_not_available", label: "Customer not available" },
    { value: "cancelled", label: "Cancelled" },
  );
  return options;
}

const STATUS_LABEL_ALIASES: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  assigned: "Assigned",
  picked_up: "Picked Up",
  "picked up": "Picked Up",
  out_for_delivery: "Out for Delivery",
  "out for delivery": "Out for Delivery",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
  customer_not_available: "Customer not available",
};

/** Normalize backlog/report status strings for display. */
export function formatOrderStatusLabel(
  status: string | null | undefined,
  delivery?: ShopDeliverySettings | null,
): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "—";
  const normalized =
    STATUS_LABEL_ALIASES[raw.toLowerCase()] ??
    STATUS_LABEL_ALIASES[raw.replace(/\s+/g, "_").toLowerCase()] ??
    raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (!isOrderStatusVisibleForShop(normalized, delivery)) {
    if (normalized === "Preparing") return "Accepted";
    if (normalized === "Ready") {
      return normalizeDeliveryLifecycleFlags(delivery).preparingStatusEnabled
        ? "Preparing"
        : "Accepted";
    }
    if (normalized === "Picked Up") return "Out for Delivery";
  }

  return normalized;
}

/** Hide gated status keys from report status_counts when shop settings known. */
export function filterReportStatusCounts(
  counts: Record<string, number> | null | undefined,
  delivery?: ShopDeliverySettings | null,
): Record<string, number> {
  if (!counts) return {};
  const flags = normalizeDeliveryLifecycleFlags(delivery);
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    const label = formatOrderStatusLabel(key, delivery);
    const hidden =
      (!flags.preparingStatusEnabled &&
        (key === "preparing" || key === "Preparing")) ||
      (!flags.readyStatusEnabled && (key === "ready" || key === "Ready")) ||
      (flags.pickupDisabled &&
        (key === "picked_up" ||
          key === "Picked Up" ||
          key === "picked up"));
    if (hidden) continue;
    out[label] = (out[label] ?? 0) + (Number(value) || 0);
  }
  return out;
}
