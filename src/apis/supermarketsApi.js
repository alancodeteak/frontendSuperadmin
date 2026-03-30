import { cachedGetJson } from '@/apis/cachedGet'
import { TTL_MS } from '@/utils/responseCache'
import { requestRaw, normalizeApiError as normalizeClientError } from '@/apis/httpClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

/**
 * @typedef {'active'|'inactive'|'suspended'|'blocked'} SupermarketStatus
 */

/**
 * @typedef {Object} SupermarketCreateRequest
 * @property {number} user_id
 * @property {string} shop_name
 * @property {string} password
 * @property {SupermarketStatus=} status
 * @property {string|null=} phone
 * @property {string|null=} email
 * @property {string|null=} shop_license_no
 * @property {string|null=} photo
 * @property {Object} address
 * @property {string} address.street_address
 * @property {string} address.city
 * @property {string} address.state
 * @property {string} address.pincode
 * @property {number|null=} address.latitude
 * @property {number|null=} address.longitude
 * @property {Object|null=} promotion
 * @property {boolean=} promotion.is_marketing_enabled
 * @property {Object|null=} subscription
 * @property {string=} subscription.start_date
 * @property {number=} subscription.amount
 * @property {string=} subscription.status
 */

function normalizeApiError(payload, fallbackMessage) {
  if (payload?.error) {
    return {
      code: payload.error.code ?? 'INTERNAL_SERVER_ERROR',
      message: payload.error.message ?? fallbackMessage,
      requestId: payload.error.request_id ?? null,
      details: payload.error.details ?? null,
    }
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    requestId: null,
    details: null,
  }
}

async function requestJson({ path, method = 'GET', accessToken, body }) {
  if (method === 'GET' && body === undefined) {
    return cachedGetJson({
      path,
      accessToken,
      ttlMs: TTL_MS.DEFAULT_GET,
      onHttpError: (json) => normalizeApiError(json, 'Request failed. Please try again.'),
      select: (j) => j,
    })
  }
  // Use shared HTTP client for HTTPS enforcement + timeouts.
  return requestRaw({
    path,
    method,
    accessToken,
    body,
    headers: body ? { 'Content-Type': 'application/json' } : {},
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

export async function listSupermarkets(
  { page = 1, limit = 20, name, user_id: userId, shop_id: shopId, phone, sort } = {},
  { accessToken },
) {
  // Backend: list limit max is 100 (FastAPI Query le=100)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const query = buildQuery({
    page,
    limit: safeLimit,
    name,
    user_id: userId,
    shop_id: shopId,
    phone,
    sort,
  })
  const response = await requestJson({
    path: `/supermarkets/${query}`,
    method: 'GET',
    accessToken,
  })
  return {
    items: response?.data ?? [],
    meta: response?.meta ?? null,
  }
}

export async function getSupermarket({ user_id: userId }, { accessToken }) {
  const response = await requestJson({
    path: `/supermarkets/${encodeURIComponent(String(userId))}`,
    method: 'GET',
    accessToken,
  })
  return response?.data
}

/**
 * @param {SupermarketCreateRequest} payload
 * @param {{ accessToken: string }} opts
 */
export async function createSupermarket(payload, { accessToken }) {
  const response = await requestJson({
    path: '/supermarkets/',
    method: 'POST',
    accessToken,
    body: payload,
  })
  return response?.data
}

export async function updateSupermarket({ user_id: userId, patch }, { accessToken }) {
  const response = await requestJson({
    path: `/supermarkets/${encodeURIComponent(String(userId))}`,
    method: 'PATCH',
    accessToken,
    body: patch,
  })
  return response?.data
}

export async function deleteSupermarket({ user_id: userId }, { accessToken }) {
  const response = await requestJson({
    path: `/supermarkets/${encodeURIComponent(String(userId))}`,
    method: 'DELETE',
    accessToken,
  })
  return response?.data
}

