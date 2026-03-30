import { cachedGetJson } from '@/apis/cachedGet'
import { TTL_MS } from '@/utils/responseCache'
import { normalizeApiError as normalizeClientError, requestRaw } from '@/apis/httpClient'

const DELIVERY_PARTNERS_PATH =
  import.meta.env.VITE_DELIVERY_PARTNERS_PATH ?? '/delivery-partners/'

function normalizeApiError(payload, fallbackMessage, httpStatus = null) {
  if (payload?.error) {
    return {
      code: payload.error.code ?? 'INTERNAL_SERVER_ERROR',
      message: payload.error.message ?? fallbackMessage,
      requestId: payload.error.request_id ?? null,
      details: payload.error.details ?? null,
      httpStatus,
    }
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    requestId: null,
    details: null,
    httpStatus,
  }
}

async function requestJson({ path, method = 'GET', accessToken, body }) {
  if (method === 'GET' && body === undefined) {
    return cachedGetJson({
      path,
      accessToken,
      ttlMs: TTL_MS.DEFAULT_GET,
      onHttpError: (json, response) => normalizeApiError(json, 'Request failed. Please try again.', response.status),
      select: (j) => j,
    })
  }
  // Use shared HTTP client for HTTPS enforcement + timeouts.
  return requestRaw({
    path,
    method,
    accessToken,
    body,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    onHttpError: (json) => normalizeClientError(json, 'Request failed. Please try again.'),
  })
}

function buildQuery(params) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
  if (!entries.length) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of entries) usp.set(k, String(v))
  return `?${usp.toString()}`
}

export async function listDeliveryPartners(
  {
    page = 1,
    limit = 20,
    name,
    delivery_partner_id: deliveryPartnerId,
    shop_id: shopId,
    shop_name: shopName,
    phone,
    current_status: currentStatus,
    online_status: onlineStatus,
  } = {},
  { accessToken },
) {
  const qs = buildQuery({
    page,
    limit,
    name,
    delivery_partner_id: deliveryPartnerId,
    shop_id: shopId,
    shop_name: shopName,
    phone,
    current_status: currentStatus,
    online_status: onlineStatus,
  })
  const response = await requestJson({
    path: `${DELIVERY_PARTNERS_PATH}${qs}`,
    method: 'GET',
    accessToken,
  })

  return {
    items: response?.data ?? [],
    meta: response?.meta ?? null,
  }
}

export async function getDeliveryPartnerDetail(
  { delivery_partner_id: deliveryPartnerId },
  { accessToken },
) {
  const id = String(deliveryPartnerId ?? '').trim()
  const response = await requestJson({
    path: `${DELIVERY_PARTNERS_PATH}${encodeURIComponent(id)}`,
    method: 'GET',
    accessToken,
  })
  return response?.data ?? null
}

export async function blockDeliveryPartner(
  { delivery_partner_id: deliveryPartnerId, blocked },
  { accessToken },
) {
  const id = String(deliveryPartnerId ?? '').trim()
  const response = await requestJson({
    path: `${DELIVERY_PARTNERS_PATH}${encodeURIComponent(id)}/block`,
    method: 'PATCH',
    accessToken,
    body: { blocked: Boolean(blocked) },
  })
  return response?.data ?? null
}

export async function deleteDeliveryPartner(
  { delivery_partner_id: deliveryPartnerId },
  { accessToken },
) {
  const id = String(deliveryPartnerId ?? '').trim()
  const response = await requestJson({
    path: `${DELIVERY_PARTNERS_PATH}${encodeURIComponent(id)}`,
    method: 'DELETE',
    accessToken,
  })
  return response?.data ?? null
}

export async function restoreDeliveryPartner(
  { delivery_partner_id: deliveryPartnerId },
  { accessToken },
) {
  const id = String(deliveryPartnerId ?? '').trim()
  const response = await requestJson({
    path: `${DELIVERY_PARTNERS_PATH}${encodeURIComponent(id)}/restore`,
    method: 'PATCH',
    accessToken,
  })
  return response?.data ?? null
}

export async function getDeliveryPartnerActivity(
  { delivery_partner_id: deliveryPartnerId, days = 7 },
  { accessToken },
) {
  const id = String(deliveryPartnerId ?? '').trim()
  const qs = buildQuery({ days })
  const response = await requestJson({
    path: `/analytics/delivery-partners/${encodeURIComponent(id)}/activity${qs}`,
    method: 'GET',
    accessToken,
  })
  return response?.data ?? null
}

