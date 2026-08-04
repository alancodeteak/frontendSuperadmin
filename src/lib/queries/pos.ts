import { queryOptions } from "@tanstack/react-query";

import {
  getPosTemplate,
  listPosTemplates,
  listShopLinks,
} from "@/lib/api/pos";

export const posKeys = {
  all: ["pos"] as const,
  templates: (params: Record<string, unknown>) =>
    [...posKeys.all, "templates", params] as const,
  template: (id: string | number) =>
    [...posKeys.all, "template", String(id)] as const,
  shopLinks: (params: Record<string, unknown>) =>
    [...posKeys.all, "shop-links", params] as const,
};

export function posTemplatesQuery(params: {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  connector_type?: string;
  is_active?: boolean;
  is_system?: boolean;
}) {
  return queryOptions({
    queryKey: posKeys.templates(params),
    queryFn: () => listPosTemplates(params),
    staleTime: 30_000,
  });
}

export function posTemplateQuery(id: string | number) {
  return queryOptions({
    queryKey: posKeys.template(id),
    queryFn: () => getPosTemplate(id),
    enabled: Boolean(id),
  });
}

export function posShopLinksQuery(params: {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  connector_type?: string;
  is_active?: boolean;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  shop_id?: string;
}) {
  return queryOptions({
    queryKey: posKeys.shopLinks(params),
    queryFn: () => listShopLinks(params),
    staleTime: 30_000,
  });
}
