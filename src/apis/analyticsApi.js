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
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    requestId: null,
    details: null,
  }
}

export async function getShopActivity({ user_id: userId, days = 7 }, { accessToken }) {
  const query = new URLSearchParams({ days: String(days) })
  const response = await fetch(
    buildUrl(`/analytics/shops/${encodeURIComponent(String(userId))}/activity?${query.toString()}`),
    {
      method: 'GET',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  )

  const json = await readJson(response)
  if (!response.ok) {
    throw normalizeApiError(json, 'Failed to load shop activity')
  }
  return json?.data ?? null
}
