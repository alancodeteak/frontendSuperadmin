export async function getSalesActivityOverview({ days = 30 } = {}, { accessToken } = {}) {
  const res = await fetch(buildUrl(`/api/v1/admin/sales-activity/overview?days=${encodeURIComponent(String(days))}`), {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const payload = await readJson(res)
  if (!res.ok) throw normalizeApiError(payload, 'Failed to load sales activity overview')
  return payload?.data
}

export async function getSalesActivityMonthly({ months = 6 } = {}, { accessToken } = {}) {
  const res = await fetch(buildUrl(`/api/v1/admin/sales-activity/monthly?months=${encodeURIComponent(String(months))}`), {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const payload = await readJson(res)
  if (!res.ok) throw normalizeApiError(payload, 'Failed to load sales activity monthly data')
  return payload?.data
}

export async function getSalesActivityTopShops({ limit = 20 } = {}, { accessToken } = {}) {
  const res = await fetch(buildUrl(`/api/v1/admin/sales-activity/top-shops?limit=${encodeURIComponent(String(limit))}`), {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const payload = await readJson(res)
  if (!res.ok) throw normalizeApiError(payload, 'Failed to load sales activity top shops')
  return payload?.data
}

export async function getSalesActivityForecast({ monthsBack = 6 } = {}, { accessToken } = {}) {
  const res = await fetch(buildUrl(`/api/v1/admin/sales-activity/forecast?months_back=${encodeURIComponent(String(monthsBack))}`), {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const payload = await readJson(res)
  if (!res.ok) throw normalizeApiError(payload, 'Failed to load sales activity forecast')
  return payload?.data
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

async function readJson(response) {
  return response.json().catch(() => null)
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
  return { code: 'INTERNAL_SERVER_ERROR', message: fallbackMessage, requestId: null, details: null }
}

