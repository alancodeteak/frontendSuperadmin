import { queryOptions } from "@tanstack/react-query";

import {
  getPosTemplate,
  listPosTemplates,
  listShopLinks,
} from "@/lib/api/pos";

export const posKeys = {
  all: ["pos"] as const,
  templates: (params: { page?: number; limit?: number }) =>
    [...posKeys.all, "templates", params] as const,
  template: (id: string | number) =>
    [...posKeys.all, "template", String(id)] as const,
  shopLinks: (params: { page?: number; limit?: number; shop_id?: string }) =>
    [...posKeys.all, "shop-links", params] as const,
};

export function posTemplatesQuery(params: { page?: number; limit?: number }) {
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
  shop_id?: string;
}) {
  return queryOptions({
    queryKey: posKeys.shopLinks(params),
    queryFn: () => listShopLinks(params),
    staleTime: 30_000,
  });
}
