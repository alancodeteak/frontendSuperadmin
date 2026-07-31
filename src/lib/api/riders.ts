import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockBlockRider,
  mockCreateRider,
  mockDeleteRider,
  mockGetNextRiderId,
  mockGetRider,
  mockListRiders,
  mockPatchRider,
  mockResetRiderPassword,
  mockUnblockRider,
} from "@/lib/mock-data";
import type { CreateRiderInput, Paginated, Rider } from "@/types/api";

export type NextRiderIdResponse = {
  delivery_partner_id?: string;
  next_id?: string;
  code?: string;
};

export function listRiders(
  shopId: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
    is_blocked?: boolean;
    online_status?: string;
    include_deleted?: boolean;
    deleted_only?: boolean;
  },
) {
  if (isDevelopmentMode()) return mockListRiders(shopId, params);
  return apiFetch<Paginated<Rider>>(`/v2/shops/${shopId}/riders`, { params });
}

export function getNextRiderId(shopId: string) {
  if (isDevelopmentMode()) return mockGetNextRiderId(shopId);
  return apiFetch<NextRiderIdResponse>(
    `/v2/shops/${shopId}/riders/next-id`,
  );
}

export function createRider(shopId: string, input: CreateRiderInput) {
  if (isDevelopmentMode()) return mockCreateRider(shopId, input);
  return apiFetch<Rider>(`/v2/shops/${shopId}/riders`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getRider(shopId: string, dpId: string) {
  if (isDevelopmentMode()) return mockGetRider(shopId, dpId);
  return apiFetch<Rider>(`/v2/shops/${shopId}/riders/${dpId}`);
}

export function patchRider(
  shopId: string,
  dpId: string,
  input: Record<string, unknown>,
) {
  if (isDevelopmentMode()) return mockPatchRider(shopId, dpId, input);
  return apiFetch<Partial<Rider>>(`/v2/shops/${shopId}/riders/${dpId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function resetRiderPassword(
  shopId: string,
  dpId: string,
  password: string,
) {
  if (isDevelopmentMode()) return mockResetRiderPassword();
  return apiFetch<unknown>(
    `/v2/shops/${shopId}/riders/${dpId}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    },
  );
}

export function blockRider(shopId: string, dpId: string) {
  if (isDevelopmentMode()) return mockBlockRider(shopId, dpId);
  return apiFetch<unknown>(`/v2/shops/${shopId}/riders/${dpId}/block`, {
    method: "POST",
  });
}

export function unblockRider(shopId: string, dpId: string) {
  if (isDevelopmentMode()) return mockUnblockRider(shopId, dpId);
  return apiFetch<unknown>(`/v2/shops/${shopId}/riders/${dpId}/unblock`, {
    method: "POST",
  });
}

export function deleteRider(shopId: string, dpId: string, hard = false) {
  if (isDevelopmentMode()) return mockDeleteRider(shopId, dpId, hard);
  return apiFetch<unknown>(`/v2/shops/${shopId}/riders/${dpId}`, {
    method: "DELETE",
    params: { mode: hard ? "hard" : "soft" },
  });
}

export function restoreRider(shopId: string, dpId: string) {
  if (isDevelopmentMode()) return mockPatchRider(shopId, dpId, { is_deleted: false });
  return patchRider(shopId, dpId, { is_deleted: false });
}
