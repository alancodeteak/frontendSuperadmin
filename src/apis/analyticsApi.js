import { cachedGetJson } from '@/apis/cachedGet'
import { TTL_MS } from '@/utils/responseCache'

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
  return cachedGetJson({
    path: `/analytics/shops/${encodeURIComponent(String(userId))}/activity?${query.toString()}`,
    accessToken,
    ttlMs: TTL_MS.DEFAULT_GET,
    onHttpError: (json) => normalizeApiError(json, 'Failed to load shop activity'),
    select: (j) => j?.data ?? null,
  })
}
