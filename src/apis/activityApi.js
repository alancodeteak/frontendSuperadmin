import { cachedGetJson } from '@/apis/cachedGet'
import { TTL_MS } from '@/utils/responseCache'
import { normalizeApiError } from '@/apis/httpClient'

async function requestJson({ path, accessToken }) {
  return cachedGetJson({
    path,
    accessToken,
    ttlMs: TTL_MS.DEFAULT_GET,
    onHttpError: (json) => normalizeApiError(json, 'Failed to load recent activity'),
    select: (j) => j?.data ?? [],
  })
}

export async function getRecentAdminActivity({ limit = 20 } = {}, { accessToken }) {
  const query = new URLSearchParams({ limit: String(limit) })
  return requestJson({ path: `/api/v1/admin/activity/recent?${query.toString()}`, accessToken })
}

