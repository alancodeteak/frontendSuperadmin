import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockAttachShopLink,
  mockClonePosTemplate,
  mockCreatePosTemplate,
  mockDeletePosTemplate,
  mockGetPosTemplate,
  mockGetShopLink,
  mockGetSyncStatus,
  mockListPosTemplates,
  mockListShopLinks,
  mockPatchLinkFeatures,
  mockPatchPosTemplate,
  mockTestConnectionPosTemplate,
  mockTestMapPosTemplate,
} from "@/lib/mock-data";
import type {
  Paginated,
  PosShopLink,
  PosTemplate,
  PosTemplateSummary,
} from "@/types/api";

export type PosProvider = "cratis" | "generic";
export type PosConnectorType = "cratis" | "generic_json" | "webhook_inbound";

export type CreatePosTemplateInput = {
  name: string;
  provider: PosProvider;
  version: string;
  connector_type: PosConnectorType;
  description?: string;
  is_system?: boolean;
  is_active?: boolean;
  config: Record<string, unknown>;
};

/** Fields accepted by PATCH /v2/pos/templates/:id (strict schema). */
export type UpdatePosTemplateInput = {
  description?: string;
  is_active?: boolean;
  version?: string;
  config?: Record<string, unknown>;
};

/** Valid starter config matching admin-api Zod schema. */
export function defaultPosTemplateConfig(): Record<string, unknown> {
  return {
    api: {
      baseUrl: "https://pos.example.com",
      auth: { type: "none" },
      menuTenant: { account: "acc", location: "loc" },
      orderTenant: { account: "acc", location: "loc" },
      endpoints: {
        menu: {
          method: "GET",
          path: "/menu",
          query: {},
          body: {},
          inbound: false,
        },
        menuCategories: { method: "GET", path: "/menu/categories" },
        menuProducts: { method: "GET", path: "/menu/products" },
        orderCreate: { method: "POST", path: "/orders" },
        orderStatus: { method: "GET", path: "/orders/status" },
        riderSync: { method: "POST", path: "/riders" },
        orderStatusWebhook: {
          method: "POST",
          path: "/webhook",
          inbound: true,
        },
      },
    },
    capabilities: [
      "order_inbound",
      "order_outbound",
      "status_outbound",
      "status_inbound",
      "catalog_sync",
      "rider_sync",
    ],
    status_update: { mode: "api", realtime: false },
    mappings: {
      order_inbound: {
        order_id: { paths: ["id"] },
      },
    },
    value_maps: {},
    transforms: {},
    hooks: [],
  };
}

/** API requires /^[a-z0-9][a-z0-9_-]*$/i */
export function slugifyPosTemplateName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export function listPosTemplates(params?: { page?: number; limit?: number }) {
  if (isDevelopmentMode()) return mockListPosTemplates();
  return apiFetch<Paginated<PosTemplateSummary>>("/v2/pos/templates", {
    params,
  });
}

export function createPosTemplate(input: CreatePosTemplateInput) {
  if (isDevelopmentMode()) return mockCreatePosTemplate(input);
  return apiFetch<PosTemplate>("/v2/pos/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPosTemplate(id: string | number) {
  if (isDevelopmentMode()) return mockGetPosTemplate(id);
  return apiFetch<PosTemplate>(`/v2/pos/templates/${id}`);
}

export function patchPosTemplate(
  id: string | number,
  input: UpdatePosTemplateInput,
) {
  if (isDevelopmentMode()) return mockPatchPosTemplate(id, input);
  return apiFetch<PosTemplate>(`/v2/pos/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function clonePosTemplate(id: string | number) {
  if (isDevelopmentMode()) return mockClonePosTemplate(id);
  return apiFetch<PosTemplate>(`/v2/pos/templates/${id}/clone`, {
    method: "POST",
  });
}

export function testMapPosTemplate(
  id: string | number,
  input: {
    mapping_section?: string;
    sample_payload: Record<string, unknown>;
  },
) {
  if (isDevelopmentMode()) return mockTestMapPosTemplate();
  return apiFetch<unknown>(`/v2/pos/templates/${id}/test-map`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function testConnectionPosTemplate(
  id: string | number,
  input: {
    endpoint_key:
      | "menu"
      | "menuCategories"
      | "menuProducts"
      | "orderCreate"
      | "orderStatus"
      | "riderSync";
    shop_id?: string;
  },
) {
  if (isDevelopmentMode()) return mockTestConnectionPosTemplate();
  return apiFetch<unknown>(`/v2/pos/templates/${id}/test-connection`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deletePosTemplate(id: string | number) {
  if (isDevelopmentMode()) return mockDeletePosTemplate(id);
  return apiFetch<unknown>(`/v2/pos/templates/${id}`, {
    method: "DELETE",
  });
}

export function listShopLinks(params?: {
  page?: number;
  limit?: number;
  shop_id?: string;
}) {
  if (isDevelopmentMode()) return mockListShopLinks(params);
  return apiFetch<Paginated<PosShopLink>>("/v2/pos/shop-links", { params });
}

export function getShopLink(shopId: string) {
  if (isDevelopmentMode()) return mockGetShopLink(shopId);
  return apiFetch<PosShopLink>(`/v2/pos/shops/${shopId}/link`);
}

export function attachShopLink(shopId: string, input: Record<string, unknown>) {
  if (isDevelopmentMode()) return mockAttachShopLink(shopId, input);
  return apiFetch<PosShopLink>(`/v2/pos/shops/${shopId}/link`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function patchLinkFeatures(
  shopId: string,
  input: Record<string, unknown>,
) {
  if (isDevelopmentMode()) return mockPatchLinkFeatures(shopId, input);
  return apiFetch<PosShopLink>(`/v2/pos/shops/${shopId}/link/features`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getSyncStatus(shopId: string) {
  if (isDevelopmentMode()) return mockGetSyncStatus(shopId);
  return apiFetch<Record<string, unknown>>(
    `/v2/pos/shops/${shopId}/sync-status`,
  );
}
