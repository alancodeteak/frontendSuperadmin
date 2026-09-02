import type { ShopDeliverySettings } from "@/types/api";

/** Mirrors admin-api shopDeliveryFieldsSchema superRefine rules. */
export function validateShopDeliverySettings(
  input: ShopDeliverySettings,
): string | null {
  const deliveryTime = Number(input.delivery_time);
  if (
    input.delivery_time != null &&
    (!Number.isInteger(deliveryTime) || deliveryTime < 1 || deliveryTime > 1440)
  ) {
    return "Delivery time must be an integer between 1 and 1440 minutes";
  }

  if (
    input.pickup_disabled === true &&
    input.bonus_penalty_start_status === "picked_up"
  ) {
    return "Bonus penalty start status cannot be Picked up when pickup is disabled";
  }

  if (input.common_penalty_enabled === true && input.self_assigned !== true) {
    return "Common penalty requires self-assigned delivery to be enabled";
  }

  const commission = Number(input.dp_commission_percent);
  if (
    input.dp_commission_percent != null &&
    (!Number.isFinite(commission) || commission < 0 || commission > 100)
  ) {
    return "DP commission percent must be between 0 and 100";
  }

  return null;
}
