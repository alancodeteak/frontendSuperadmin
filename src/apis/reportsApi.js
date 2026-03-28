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

async function requestJson({ path, accessToken }) {
  return cachedGetJson({
    path,
    accessToken,
    ttlMs: TTL_MS.DEFAULT_GET,
    onHttpError: (json) => normalizeApiError(json, 'Failed to load report'),
    select: (j) => j?.data ?? null,
  })
}

export async function getReportsOverview({ days = 30 }, { accessToken }) {
  return requestJson({ path: `/analytics/reports/overview?days=${encodeURIComponent(String(days))}`, accessToken })
}

export async function getReportsShops({ days = 30, limit = 10 }, { accessToken }) {
  return requestJson({
    path: `/analytics/reports/shops?days=${encodeURIComponent(String(days))}&limit=${encodeURIComponent(String(limit))}`,
    accessToken,
  })
}

export async function getReportsDeliveryPartners({ days = 30, limit = 10 }, { accessToken }) {
  return requestJson({
    path: `/analytics/reports/delivery-partners?days=${encodeURIComponent(String(days))}&limit=${encodeURIComponent(String(limit))}`,
    accessToken,
  })
}

export async function getReportsFunnel({ days = 30 }, { accessToken }) {
  return requestJson({ path: `/analytics/reports/funnel?days=${encodeURIComponent(String(days))}`, accessToken })
}

export async function getReportsFinance({ days = 30 }, { accessToken }) {
  return requestJson({ path: `/analytics/reports/finance?days=${encodeURIComponent(String(days))}`, accessToken })
}
