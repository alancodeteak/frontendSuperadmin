import { apiFetch } from "@/lib/api";
import type {
  CustomerMergeAuditEntry,
  CustomerMergeListResult,
  CustomerMergeRequest,
  CustomerMergeStatus,
} from "@/types/api";

type PaginatedEnvelope<T> = {
  data?: T;
  pagination?: {
    page?: number;
    limit?: number;
    total_count?: number;
  };
};

function unwrapList<T>(payload: PaginatedEnvelope<T[]>): {
  items: T[];
  page: number;
  limit: number;
  total: number;
} {
  const items = Array.isArray(payload.data) ? payload.data : [];
  const page = payload.pagination?.page ?? 1;
  const limit = payload.pagination?.limit ?? items.length;
  const total = payload.pagination?.total_count ?? items.length;
  return { items, page, limit, total };
}

export function listCustomerMerges(params?: {
  status?: CustomerMergeStatus;
  page?: number;
  limit?: number;
}): Promise<CustomerMergeListResult> {
  return apiFetch<PaginatedEnvelope<CustomerMergeRequest[]>>(
    "/v2/customer-merges",
    {
      params: {
        status: params?.status,
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
      },
    },
  ).then((payload) => {
    const { items, page, limit, total } = unwrapList(payload);
    return { items, page, limit, total };
  });
}

export function getCustomerMerge(requestId: string): Promise<CustomerMergeRequest> {
  return apiFetch<CustomerMergeRequest>(`/v2/customer-merges/${requestId}`);
}

export function listCustomerMergeAudit(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  items: CustomerMergeAuditEntry[];
  page: number;
  limit: number;
  total: number;
}> {
  return apiFetch<PaginatedEnvelope<CustomerMergeAuditEntry[]>>(
    "/v2/customer-merges/audit",
    {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
      },
    },
  ).then((payload) => unwrapList(payload));
}

export function approveCustomerMerge(
  requestId: string,
  reason: string,
): Promise<CustomerMergeRequest | { request_id: string; status: string }> {
  return apiFetch(`/v2/customer-merges/${requestId}/approve`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function rejectCustomerMerge(
  requestId: string,
  reason: string,
): Promise<CustomerMergeRequest> {
  return apiFetch(`/v2/customer-merges/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
