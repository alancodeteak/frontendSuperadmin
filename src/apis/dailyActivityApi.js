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

async function requestJson({ path, accessToken }) {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const json = await readJson(response)
  if (!response.ok) throw normalizeApiError(json, 'Daily activity request failed')
  return json?.data ?? null
}

export async function getDailyActivityOverview({ targetDate }, { accessToken }) {
  const query = new URLSearchParams()
  if (targetDate) query.set('target_date', String(targetDate))
  return requestJson({ path: `/api/v1/admin/daily-activity/overview?${query.toString()}`, accessToken })
}

export async function getDailyActivityTrends({ days = 7 }, { accessToken }) {
  const query = new URLSearchParams({ days: String(days) })
  return requestJson({ path: `/api/v1/admin/daily-activity/trends?${query.toString()}`, accessToken })
}

export async function listDailyActivityShops(
  { targetDate, page = 1, limit = 20, search, sort = 'revenue_desc' } = {},
  { accessToken },
) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: String(sort),
  })
  if (targetDate) query.set('target_date', String(targetDate))
  if (search) query.set('search', String(search))
  const response = await fetch(buildUrl(`/api/v1/admin/daily-activity/shops?${query.toString()}`), {
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  const json = await readJson(response)
  if (!response.ok) throw normalizeApiError(json, 'Failed to load shop activity')
  return { items: json?.data ?? [], meta: json?.meta ?? null }
}

