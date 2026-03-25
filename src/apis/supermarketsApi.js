const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function debugLog(message, data) {
  // #region agent log
  fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c70081'},body:JSON.stringify({sessionId:'c70081',runId:'supermarkets-api',hypothesisId:'SUP_API',location:'supermarketsApi.js',message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

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

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

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

async function readJson(response) {
  return response.json().catch(() => null)
}

async function requestJson({ path, method = 'GET', accessToken, body }) {
  debugLog('request:start', {
    method,
    path,
    hasBody: Boolean(body),
    hasAccessToken: Boolean(accessToken),
  })

  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await readJson(response)
  if (!response.ok) {
    debugLog('request:error', {
      method,
      path,
      status: response.status,
      code: json?.error?.code ?? null,
      message: json?.error?.message ?? null,
    })
    throw normalizeApiError(json, 'Request failed. Please try again.')
  }

  debugLog('request:success', {
    method,
    path,
    status: response.status,
    hasData: json?.data !== undefined,
    hasMeta: json?.meta !== undefined,
  })
  return json
}

function buildQuery(params) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
  if (!entries.length) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of entries) usp.set(k, String(v))
  return `?${usp.toString()}`
}

export async function listSupermarkets(
  { page = 1, limit = 20, name, user_id: userId, shop_id: shopId, phone } = {},
  { accessToken },
) {
  const query = buildQuery({
    page,
    limit,
    name,
    user_id: userId,
    shop_id: shopId,
    phone,
  })
  const response = await requestJson({
    path: `/supermarkets/${query}`,
    method: 'GET',
    accessToken,
  })
  console.log('***********supermarkets listing************',response)
  debugLog('listSupermarkets:result', {
    count: Array.isArray(response?.data) ? response.data.length : 0,
    meta: response?.meta ?? null,
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
  console.log('******getting detailed supermarket**********',response) 
  debugLog('getSupermarket:result', {
    user_id: userId ? String(userId) : null,
    hasData: Boolean(response?.data),
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
  console.log('**********supermarket created**********',response)
  debugLog('createSupermarket:result', {
    hasData: Boolean(response?.data),
    user_id: response?.data?.shop_owner?.user_id ?? null,
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
  debugLog('updateSupermarket:result', {
    user_id: userId ? String(userId) : null,
    hasData: Boolean(response?.data),
  })
  return response?.data
}

export async function deleteSupermarket({ user_id: userId }, { accessToken }) {
  const response = await requestJson({
    path: `/supermarkets/${encodeURIComponent(String(userId))}`,
    method: 'DELETE',
    accessToken,
  })
  console.log('******supermarket deleted**********',response)
  debugLog('deleteSupermarket:result', {
    user_id: userId ? String(userId) : null,
    data: response?.data ?? null,
  })
  return response?.data
}

