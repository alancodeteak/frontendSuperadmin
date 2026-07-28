import { ApiError, apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockCreateShop,
  mockCreateSubscription,
  mockDeleteShop,
  mockGetActiveSubscription,
  mockGetDeliverySettings,
  mockGetPromotion,
  mockGetShop,
  mockGetShopActivity,
  mockListShopProducts,
  mockListShops,
  mockPatchShop,
  mockPutDeliverySettings,
  mockPutPromotion,
  mockTriggerShopLogout,
} from "@/lib/mock-data";
import {
  SHOP_USER_ID_MAX,
  SHOP_USER_ID_MIN,
} from "@/lib/shop-create-validation";
import type {
  CreateShopInput,
  Paginated,
  ShopActivityResponse,
  ShopDetail,
  ShopListItem,
  ShopProduct,
  ShopStatus,
  TriggerShopLogoutResponse,
} from "@/types/api";

export function listShops(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: ShopStatus | string;
  include_deleted?: boolean;
  deleted_only?: boolean;
}) {
  if (isDevelopmentMode()) return mockListShops(params);
  return apiFetch<Paginated<ShopListItem>>("/v2/shops", { params });
}

/** Fetch every shop page until the full catalog is loaded. */
export async function listAllShops(params?: {
  q?: string;
  status?: ShopStatus | string;
  pageSize?: number;
  include_deleted?: boolean;
  deleted_only?: boolean;
}) {
  const pageSize = params?.pageSize ?? 100;
  const all: ShopListItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await listShops({
      page,
      limit: pageSize,
      q: params?.q,
      status: params?.status,
      include_deleted: params?.include_deleted,
      deleted_only: params?.deleted_only,
    });
    const items = data.items ?? [];
    all.push(...items);
    totalPages =
      data.total_pages ??
      (data.total != null ? Math.ceil(data.total / pageSize) : 1);
    if (items.length < pageSize) break;
    page += 1;
  } while (page <= totalPages && page <= 50);

  return {
    items: all,
    total: all.length,
    page: 1,
    limit: all.length,
  } satisfies Paginated<ShopListItem>;
}

export function createShop(input: CreateShopInput) {
  if (isDevelopmentMode()) return mockCreateShop(input);

  // Only send defined values — empty strings / undefined often fail Zod.
  const body: Record<string, unknown> = {
    shop_name: input.shop_name,
    shop_id: input.shop_id,
    password: input.password,
    user_id: input.user_id,
  };

  const optionalKeys: Array<keyof CreateShopInput> = [
    "ecom_enabled",
    "ecom_slug",
    "phone",
    "email",
    "address",
  ];
  for (const key of optionalKeys) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== "") {
      body[key] = value;
    }
  }

  return apiFetch<ShopDetail>("/v2/shops", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Client-side next free shop login `user_id` (100000–999999).
 * API has no GET /shops/next-user-id — scan list and pick the next unused id.
 * Not reserved; race possible if two admins create at once.
 */
export async function suggestNextShopUserId(): Promise<number> {
  const { items } = await listAllShops({ pageSize: 100 });
  const used = new Set<number>();
  for (const shop of items) {
    const id = Number(shop.user_id);
    if (
      Number.isInteger(id) &&
      id >= SHOP_USER_ID_MIN &&
      id <= SHOP_USER_ID_MAX
    ) {
      used.add(id);
    }
  }

  let candidate = SHOP_USER_ID_MIN;
  if (used.size > 0) {
    const maxUsed = Math.max(...used);
    candidate = Math.min(maxUsed + 1, SHOP_USER_ID_MAX);
  }

  while (candidate <= SHOP_USER_ID_MAX) {
    if (!used.has(candidate)) return candidate;
    candidate += 1;
  }

  for (let id = SHOP_USER_ID_MIN; id <= SHOP_USER_ID_MAX; id += 1) {
    if (!used.has(id)) return id;
  }

  throw new Error(
    `No free shop user_id left in range ${SHOP_USER_ID_MIN}–${SHOP_USER_ID_MAX}`,
  );
}

/** True when shop_id is free (GET detail returns 404). */
export async function isShopIdAvailable(shopId: string): Promise<boolean> {
  const id = shopId.trim();
  if (!id) return false;
  try {
    await getShop(id);
    return false;
  } catch (err) {
    const status =
      err instanceof ApiError
        ? err.status
        : err && typeof err === "object" && "status" in err
          ? Number((err as { status: unknown }).status)
          : null;
    if (status === 404) return true;
    // Don't block create on transient server errors
    if (status != null && status >= 500) return true;
    throw err;
  }
}

export function getShop(
  shopId: string,
  params?: {
    products_page?: number;
    products_limit?: number;
    include?: string;
  },
) {
  if (isDevelopmentMode()) return mockGetShop(shopId);
  return apiFetch<ShopDetail>(`/v2/shops/${shopId}`, { params });
}

export function patchShop(shopId: string, input: Record<string, unknown>) {
  if (isDevelopmentMode()) return mockPatchShop(shopId, input);
  return apiFetch<Partial<ShopDetail>>(`/v2/shops/${shopId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Upload shop logo/photo (R2 CDN). Accepts jpeg/png/webp. */
export function patchShopPhoto(
  shopId: string,
  input: { photo_base64: string; photo_content_type: string },
) {
  return patchShop(shopId, input);
}

/** Remove shop logo/photo. */
export function clearShopPhoto(shopId: string) {
  return patchShop(shopId, { clear_photo: true });
}

export function deleteShop(shopId: string, hard = false) {
  if (isDevelopmentMode()) return mockDeleteShop(shopId);
  return apiFetch<unknown>(`/v2/shops/${shopId}`, {
    method: "DELETE",
    params: { mode: hard ? "hard" : "soft" },
  });
}

export function restoreShop(shopId: string) {
  if (isDevelopmentMode()) return mockPatchShop(shopId, { is_deleted: false });
  return patchShop(shopId, { is_deleted: false });
}

export function resetShopPassword(shopId: string, password: string) {
  if (isDevelopmentMode()) {
    return Promise.resolve({
      password_reset: true,
      shop_id: shopId,
      updated_at: new Date().toISOString(),
    });
  }
  return apiFetch<{
    password_reset?: boolean;
    shop_id?: string;
    user_id?: number;
    updated_at?: string;
  }>(`/v2/shops/${shopId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/** Fire-and-forget shop-scoped logout alert (202 Accepted). */
export function triggerShopLogoutEvent(shopId: string) {
  if (isDevelopmentMode()) return mockTriggerShopLogout(shopId);
  return apiFetch<TriggerShopLogoutResponse>(
    `/v2/shops/${encodeURIComponent(shopId)}/trigger-logout-event`,
    { method: "POST" },
  );
}

export function getShopActivity(params?: {
  page?: number;
  limit?: number;
  backlog_page?: number;
  backlog_limit?: number;
  date?: string;
  active?: boolean;
  q?: string;
  min_backlog?: number;
}) {
  if (isDevelopmentMode()) return mockGetShopActivity();
  return apiFetch<ShopActivityResponse>("/v2/shops/activity", { params });
}

export function listShopProducts(
  shopId: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    availability?: string;
  },
) {
  if (isDevelopmentMode()) return mockListShopProducts(shopId, params);
  return apiFetch<Paginated<ShopProduct> | ShopProduct[]>(
    `/v2/shops/${shopId}/products`,
    { params },
  ).then((data) => {
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length,
      } satisfies Paginated<ShopProduct>;
    }
    return {
      items: data.items ?? [],
      total: data.total ?? data.items?.length ?? 0,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit,
      total_pages: data.total_pages,
    } satisfies Paginated<ShopProduct>;
  });
}

export function getDeliverySettings(shopId: string) {
  if (isDevelopmentMode()) return mockGetDeliverySettings();
  return apiFetch<Record<string, unknown>>(
    `/v2/shops/${shopId}/delivery-settings`,
  );
}

export function putDeliverySettings(
  shopId: string,
  input: Record<string, unknown>,
) {
  if (isDevelopmentMode()) return mockPutDeliverySettings(input);
  return apiFetch<Record<string, unknown>>(
    `/v2/shops/${shopId}/delivery-settings`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function createSubscription(
  shopId: string,
  input: Record<string, unknown>,
) {
  if (isDevelopmentMode()) return mockCreateSubscription(input);
  return apiFetch<Record<string, unknown>>(
    `/v2/shops/${shopId}/subscriptions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function getActiveSubscription(shopId: string) {
  if (isDevelopmentMode()) return mockGetActiveSubscription();
  return apiFetch<Record<string, unknown>>(
    `/v2/shops/${shopId}/subscriptions/active`,
  );
}

export function getPromotion(shopId: string) {
  if (isDevelopmentMode()) return mockGetPromotion();
  return apiFetch<Record<string, unknown>>(`/v2/shops/${shopId}/promotion`);
}

export function putPromotion(shopId: string, input: Record<string, unknown>) {
  if (isDevelopmentMode()) return mockPutPromotion(input);
  return apiFetch<Record<string, unknown>>(`/v2/shops/${shopId}/promotion`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
