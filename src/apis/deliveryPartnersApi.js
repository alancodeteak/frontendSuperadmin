const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const DELIVERY_PARTNERS_PATH =
  import.meta.env.VITE_DELIVERY_PARTNERS_PATH ?? '/delivery-partners/'

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

async function requestJson({ path, method = 'GET', accessToken }) {
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  const json = await readJson(response)
  if (!response.ok) {
    throw normalizeApiError(json, 'Request failed. Please try again.')
  }
  return json
}

function buildQuery(params) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
  if (!entries.length) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of entries) usp.set(k, String(v))
  return `?${usp.toString()}`
}

export async function listDeliveryPartners(
  { page = 1, limit = 10, query } = {},
  { accessToken },
) {
  // Backend param name may differ; support both `q` and `search` later if needed.
  const qs = buildQuery({ page, limit, q: query || undefined })
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

