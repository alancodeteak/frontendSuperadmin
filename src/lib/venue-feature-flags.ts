/** Master venue / multi-service flags (admin-api shop create/patch). */

export const VENUE_MASTER_FLAG_KEYS = [
  "venue_management_enabled",
  "qr_ordering_enabled",
  "table_ordering_enabled",
  "room_service_enabled",
  "pickup_ordering_enabled",
  "drive_thru_enabled",
] as const;

export type VenueMasterFlagKey = (typeof VENUE_MASTER_FLAG_KEYS)[number];

export type VenueMasterFlagsSnake = Record<VenueMasterFlagKey, boolean>;

export const DEFAULT_VENUE_MASTER_FLAGS: VenueMasterFlagsSnake = {
  venue_management_enabled: false,
  qr_ordering_enabled: false,
  table_ordering_enabled: false,
  room_service_enabled: false,
  pickup_ordering_enabled: false,
  drive_thru_enabled: false,
};

/**
 * When turning a master flag off, cascade dependents off
 * (mirrors packages/contracts cascadeVenueMasterFeatureFlags).
 */
export function cascadeVenueMasterFlagsSnake(flags: {
  ecom_enabled: boolean;
  venue_management_enabled: boolean;
  qr_ordering_enabled: boolean;
  table_ordering_enabled: boolean;
  room_service_enabled: boolean;
  pickup_ordering_enabled: boolean;
  drive_thru_enabled: boolean;
}): typeof flags {
  let next = { ...flags };

  if (!next.ecom_enabled) {
    next = {
      ...next,
      qr_ordering_enabled: false,
      table_ordering_enabled: false,
      room_service_enabled: false,
      pickup_ordering_enabled: false,
      drive_thru_enabled: false,
    };
  }

  if (!next.venue_management_enabled) {
    next = {
      ...next,
      qr_ordering_enabled: false,
      table_ordering_enabled: false,
      room_service_enabled: false,
    };
  }

  if (!next.table_ordering_enabled && !next.room_service_enabled) {
    next = { ...next, qr_ordering_enabled: false };
  }

  return next;
}

/** Client-side validation before PATCH/POST (matches admin-api rules). */
export function validateVenueMasterFlagsSnake(flags: {
  ecom_enabled: boolean;
  venue_management_enabled: boolean;
  qr_ordering_enabled: boolean;
  table_ordering_enabled: boolean;
  room_service_enabled: boolean;
  pickup_ordering_enabled: boolean;
  drive_thru_enabled: boolean;
}): string | null {
  if (flags.qr_ordering_enabled && !flags.venue_management_enabled) {
    return "qr_ordering_enabled requires venue_management_enabled";
  }
  if (flags.table_ordering_enabled && !flags.venue_management_enabled) {
    return "table_ordering_enabled requires venue_management_enabled";
  }
  if (flags.room_service_enabled && !flags.venue_management_enabled) {
    return "room_service_enabled requires venue_management_enabled";
  }
  if (flags.qr_ordering_enabled && !flags.ecom_enabled) {
    return "qr_ordering_enabled requires ecom_enabled";
  }
  if (flags.table_ordering_enabled && !flags.ecom_enabled) {
    return "table_ordering_enabled requires ecom_enabled";
  }
  if (flags.room_service_enabled && !flags.ecom_enabled) {
    return "room_service_enabled requires ecom_enabled";
  }
  if (flags.pickup_ordering_enabled && !flags.ecom_enabled) {
    return "pickup_ordering_enabled requires ecom_enabled";
  }
  if (flags.drive_thru_enabled && !flags.ecom_enabled) {
    return "drive_thru_enabled requires ecom_enabled";
  }
  if (
    flags.qr_ordering_enabled &&
    !flags.table_ordering_enabled &&
    !flags.room_service_enabled
  ) {
    return "qr_ordering_enabled requires table_ordering_enabled or room_service_enabled";
  }
  return null;
}

export function pickVenueMasterFlags(
  source: Partial<VenueMasterFlagsSnake> | null | undefined,
): VenueMasterFlagsSnake {
  return {
    venue_management_enabled: Boolean(source?.venue_management_enabled),
    qr_ordering_enabled: Boolean(source?.qr_ordering_enabled),
    table_ordering_enabled: Boolean(source?.table_ordering_enabled),
    room_service_enabled: Boolean(source?.room_service_enabled),
    pickup_ordering_enabled: Boolean(source?.pickup_ordering_enabled),
    drive_thru_enabled: Boolean(source?.drive_thru_enabled),
  };
}
