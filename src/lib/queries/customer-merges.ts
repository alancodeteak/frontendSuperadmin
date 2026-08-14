import { queryOptions } from "@tanstack/react-query";

import {
  getCustomerMerge,
  listCustomerMergeAudit,
  listCustomerMerges,
} from "@/lib/api/customer-merges";
import type { CustomerMergeStatus } from "@/types/api";

type MergeListParams = {
  status?: CustomerMergeStatus;
  page?: number;
  limit?: number;
};

export const customerMergeKeys = {
  all: ["customer-merges"] as const,
  list: (params: MergeListParams) =>
    [...customerMergeKeys.all, "list", params] as const,
  detail: (requestId: string) =>
    [...customerMergeKeys.all, "detail", requestId] as const,
  audit: (params: { page?: number; limit?: number }) =>
    [...customerMergeKeys.all, "audit", params] as const,
};

export function customerMergesListQuery(params: MergeListParams) {
  return queryOptions({
    queryKey: customerMergeKeys.list(params),
    queryFn: () => listCustomerMerges(params),
    staleTime: 15_000,
  });
}

export function customerMergeDetailQuery(requestId: string) {
  return queryOptions({
    queryKey: customerMergeKeys.detail(requestId),
    queryFn: () => getCustomerMerge(requestId),
    enabled: Boolean(requestId),
  });
}

export function customerMergeAuditQuery(params: {
  page?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: customerMergeKeys.audit(params),
    queryFn: () => listCustomerMergeAudit(params),
    staleTime: 15_000,
  });
}
