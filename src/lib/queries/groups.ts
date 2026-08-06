import { queryOptions } from "@tanstack/react-query";

import { getGroup, listGroups } from "@/lib/api/groups";
import type { GroupStatus } from "@/types/api";

type GroupListParams = {
  page?: number;
  page_size?: number;
  q?: string;
  status?: GroupStatus | string;
  include_unassigned_shops?: boolean;
};

export const groupKeys = {
  all: ["groups"] as const,
  list: (params: GroupListParams) => [...groupKeys.all, "list", params] as const,
  detail: (groupId: number | string) =>
    [...groupKeys.all, "detail", String(groupId)] as const,
};

export function groupsListQuery(params: GroupListParams) {
  return queryOptions({
    queryKey: groupKeys.list(params),
    queryFn: () => listGroups(params),
    staleTime: 30_000,
  });
}

export function groupDetailQuery(groupId: number | string) {
  return queryOptions({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId) && Number(groupId) > 0,
  });
}
