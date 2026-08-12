import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockBlockVenuePicker,
  mockCreateVenuePicker,
  mockDeleteVenuePicker,
  mockGetVenuePicker,
  mockListVenuePickers,
  mockPatchVenuePicker,
  mockResetVenuePickerPassword,
  mockUnblockVenuePicker,
} from "@/lib/mock-data";
import type {
  CreateVenuePickerInput,
  Paginated,
  VenuePicker,
  VenuePickerListItem,
  VenuePickerScope,
} from "@/types/api";

export function listVenuePickers(
  shopId: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
    is_blocked?: boolean;
    scope?: VenuePickerScope;
    dining_area_id?: number;
  },
) {
  if (isDevelopmentMode()) return mockListVenuePickers(shopId, params);
  return apiFetch<Paginated<VenuePickerListItem>>(
    `/v2/shops/${shopId}/venue-pickers`,
    { params },
  );
}

export function createVenuePicker(shopId: string, input: CreateVenuePickerInput) {
  if (isDevelopmentMode()) return mockCreateVenuePicker(shopId, input);
  return apiFetch<VenuePicker>(`/v2/shops/${shopId}/venue-pickers`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getVenuePicker(shopId: string, pickerId: string) {
  if (isDevelopmentMode()) return mockGetVenuePicker(shopId, pickerId);
  return apiFetch<VenuePicker>(
    `/v2/shops/${shopId}/venue-pickers/${pickerId}`,
  );
}

export function patchVenuePicker(
  shopId: string,
  pickerId: string,
  input: Record<string, unknown>,
) {
  if (isDevelopmentMode()) return mockPatchVenuePicker(shopId, pickerId, input);
  return apiFetch<Partial<VenuePicker>>(
    `/v2/shops/${shopId}/venue-pickers/${pickerId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function resetVenuePickerPassword(
  shopId: string,
  pickerId: string,
  password: string,
) {
  if (isDevelopmentMode()) return mockResetVenuePickerPassword();
  return apiFetch<unknown>(
    `/v2/shops/${shopId}/venue-pickers/${pickerId}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    },
  );
}

export function blockVenuePicker(shopId: string, pickerId: string) {
  if (isDevelopmentMode()) return mockBlockVenuePicker(shopId, pickerId);
  return apiFetch<unknown>(
    `/v2/shops/${shopId}/venue-pickers/${pickerId}/block`,
    { method: "POST" },
  );
}

export function unblockVenuePicker(shopId: string, pickerId: string) {
  if (isDevelopmentMode()) return mockUnblockVenuePicker(shopId, pickerId);
  return apiFetch<unknown>(
    `/v2/shops/${shopId}/venue-pickers/${pickerId}/unblock`,
    { method: "POST" },
  );
}

export function deleteVenuePicker(shopId: string, pickerId: string) {
  if (isDevelopmentMode()) return mockDeleteVenuePicker(shopId, pickerId);
  return apiFetch<VenuePicker>(
    `/v2/shops/${shopId}/venue-pickers/${pickerId}`,
    { method: "DELETE" },
  );
}
