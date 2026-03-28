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

async function getSalesCached(path, { accessToken }, fallbackMsg) {
  return cachedGetJson({
    path,
    accessToken,
    ttlMs: TTL_MS.DEFAULT_GET,
    onHttpError: (json) => normalizeApiError(json, fallbackMsg),
    select: (j) => j?.data,
  })
}

export async function getSalesActivityOverview({ days = 30 } = {}, { accessToken } = {}) {
  return getSalesCached(
    `/api/v1/admin/sales-activity/overview?days=${encodeURIComponent(String(days))}`,
    { accessToken },
    'Failed to load sales activity overview',
  )
}

export async function getSalesActivityMonthly({ months = 6 } = {}, { accessToken } = {}) {
  return getSalesCached(
    `/api/v1/admin/sales-activity/monthly?months=${encodeURIComponent(String(months))}`,
    { accessToken },
    'Failed to load sales activity monthly data',
  )
}

export async function getSalesActivityTopShops({ limit = 20 } = {}, { accessToken } = {}) {
  return getSalesCached(
    `/api/v1/admin/sales-activity/top-shops?limit=${encodeURIComponent(String(limit))}`,
    { accessToken },
    'Failed to load sales activity top shops',
  )
}

export async function getSalesActivityForecast({ monthsBack = 6 } = {}, { accessToken } = {}) {
  return getSalesCached(
    `/api/v1/admin/sales-activity/forecast?months_back=${encodeURIComponent(String(monthsBack))}`,
    { accessToken },
    'Failed to load sales activity forecast',
  )
}
