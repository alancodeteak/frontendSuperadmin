import { apiFetch } from "@/lib/api";
import type {
  CreateGroupInput,
  GroupDetail,
  GroupStatus,
  GroupSummary,
  GroupsListResult,
  ReplaceGroupShopsResult,
  UnassignedShopItem,
  UpdateGroupProfileInput,
} from "@/types/api";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page?: number;
    page_size?: number;
    total_items?: number;
    total_pages?: number;
    has_next_page?: boolean;
  };
};

function unwrapData<T>(payload: ApiEnvelope<T> | T): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listGroups(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: GroupStatus | string;
  include_unassigned_shops?: boolean;
}): Promise<GroupsListResult> {
  return apiFetch<
    ApiEnvelope<GroupSummary[] | { groups: GroupSummary[]; unassigned_shops: UnassignedShopItem[] }>
  >("/v2/groups", {
    params: {
      page: params?.page,
      page_size: params?.page_size ?? 20,
      q: params?.q,
      status: params?.status,
      include_unassigned_shops: params?.include_unassigned_shops
        ? "true"
        : undefined,
    },
  }).then((raw) => {
    const pagination = raw.pagination ?? {};
    const data = unwrapData(raw);
    let items: GroupSummary[] = [];
    let unassigned: UnassignedShopItem[] | undefined;

    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === "object" && Array.isArray(data.groups)) {
      items = data.groups;
      unassigned = data.unassigned_shops;
    }

    return {
      items,
      page: pagination.page ?? params?.page ?? 1,
      page_size: pagination.page_size ?? params?.page_size ?? 20,
      total: pagination.total_items ?? items.length,
      total_pages: pagination.total_pages ?? 1,
      has_next_page: pagination.has_next_page ?? false,
      unassigned_shops: unassigned,
    } satisfies GroupsListResult;
  });
}

export function createGroup(input: CreateGroupInput): Promise<GroupSummary> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    password: input.password,
  };
  if (input.email?.trim()) body.email = input.email.trim().toLowerCase();
  if (input.phone?.trim()) body.phone = input.phone.trim();
  if (input.slug?.trim()) body.slug = input.slug.trim();

  return apiFetch<ApiEnvelope<GroupSummary>>("/v2/groups", {
    method: "POST",
    headers: {
      "Idempotency-Key": newIdempotencyKey(),
    },
    body: JSON.stringify(body),
  }).then(unwrapData);
}

export function getGroup(groupId: number | string): Promise<GroupDetail> {
  return apiFetch<ApiEnvelope<GroupDetail>>(`/v2/groups/${groupId}`).then(
    unwrapData,
  );
}

export function updateGroupProfile(
  groupId: number | string,
  input: UpdateGroupProfileInput,
): Promise<GroupSummary> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.email !== undefined) body.email = input.email;
  if (input.phone !== undefined) body.phone = input.phone;
  if (input.slug !== undefined) body.slug = input.slug;
  if (input.status !== undefined) body.status = input.status;

  return apiFetch<ApiEnvelope<GroupSummary>>(`/v2/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then(unwrapData);
}

export function blockGroup(
  groupId: number | string,
  blockReason: string,
): Promise<GroupSummary> {
  return apiFetch<ApiEnvelope<GroupSummary>>(`/v2/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "block",
      block_reason: blockReason.trim(),
    }),
  }).then(unwrapData);
}

export function unblockGroup(groupId: number | string): Promise<GroupSummary> {
  return apiFetch<ApiEnvelope<GroupSummary>>(`/v2/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "unblock" }),
  }).then(unwrapData);
}

export function resetGroupPassword(
  groupId: number | string,
  password: string,
): Promise<GroupSummary> {
  return apiFetch<ApiEnvelope<GroupSummary>>(`/v2/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "reset_password",
      password,
    }),
  }).then(unwrapData);
}

export function deleteGroup(groupId: number | string): Promise<GroupSummary> {
  return apiFetch<ApiEnvelope<GroupSummary>>(`/v2/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "delete" }),
  }).then(unwrapData);
}

export function restoreGroup(groupId: number | string): Promise<GroupSummary> {
  return apiFetch<ApiEnvelope<GroupSummary>>(
    `/v2/groups/${groupId}/restore`,
    { method: "POST" },
  ).then(unwrapData);
}

export function replaceGroupShops(
  groupId: number | string,
  shopIds: string[],
): Promise<ReplaceGroupShopsResult> {
  return apiFetch<ApiEnvelope<ReplaceGroupShopsResult>>(
    `/v2/groups/${groupId}/shops`,
    {
      method: "PUT",
      body: JSON.stringify({ shop_ids: shopIds }),
    },
  ).then(unwrapData);
}

export function unassignGroupShop(
  groupId: number | string,
  shopId: string,
): Promise<ReplaceGroupShopsResult> {
  return apiFetch<ApiEnvelope<ReplaceGroupShopsResult>>(
    `/v2/groups/${groupId}/shops/${encodeURIComponent(shopId)}`,
    { method: "DELETE" },
  ).then(unwrapData);
}
