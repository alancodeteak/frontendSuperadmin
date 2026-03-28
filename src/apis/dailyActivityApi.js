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
  return { code: 'INTERNAL_SERVER_ERROR', message: fallbackMessage, requestId: null, details: null }
}

export async function getDailyActivityOverview({ targetDate }, { accessToken }) {
  const query = new URLSearchParams()
  if (targetDate) query.set('target_date', String(targetDate))
  return cachedGetJson({
    path: `/api/v1/admin/daily-activity/overview?${query.toString()}`,
    accessToken,
    ttlMs: TTL_MS.DAILY_OVERVIEW,
    onHttpError: (json) => normalizeApiError(json, 'Daily activity request failed'),
    select: (j) => j?.data ?? null,
  })
}

export async function getDailyActivityTrends({ days = 7 }, { accessToken }) {
  const query = new URLSearchParams({ days: String(days) })
  return cachedGetJson({
    path: `/api/v1/admin/daily-activity/trends?${query.toString()}`,
    accessToken,
    ttlMs: TTL_MS.DAILY_TRENDS,
    onHttpError: (json) => normalizeApiError(json, 'Daily activity request failed'),
    select: (j) => j?.data ?? null,
  })
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
  return cachedGetJson({
    path: `/api/v1/admin/daily-activity/shops?${query.toString()}`,
    accessToken,
    ttlMs: TTL_MS.DAILY_SHOPS,
    onHttpError: (json) => normalizeApiError(json, 'Failed to load shop activity'),
    select: (j) => ({ items: j?.data ?? [], meta: j?.meta ?? null }),
  })
}
