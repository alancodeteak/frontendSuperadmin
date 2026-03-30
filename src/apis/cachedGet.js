import { authCachePart } from '@/utils/authCacheKey'
import { TTL_MS, cacheGet, cacheSet } from '@/utils/responseCache'
import { UNAUTHORIZED_EVENT } from '@/apis/httpClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const REQUIRE_HTTPS = String(import.meta.env.VITE_REQUIRE_HTTPS ?? '').toLowerCase() === 'true'

function shouldRequireHttps() {
  if (REQUIRE_HTTPS) return true
  return String(import.meta.env.MODE).toLowerCase() === 'production'
}

function assertHttpsIfNeeded(url) {
  if (!shouldRequireHttps()) return
  const u = new URL(url)
  if (u.protocol !== 'https:') {
    throw new Error('Insecure API base URL (HTTPS required in production)')
  }
}

async function readJson(response) {
  return response.json().catch(() => null)
}

/**
 * Cached GET + JSON. Keyed by path (including query) + auth fragment.
 * Only successful `select(json)` results are stored; errors are never cached.
 *
 * @param {object} opts
 * @param {string} opts.path - Absolute path starting with / (query included)
 * @param {string} [opts.accessToken]
 * @param {number} [opts.ttlMs]
 * @param {(json: any, response: Response) => any} opts.onHttpError — return value is thrown
 * @param {(json: any) => any} [opts.select]
 * @param {Record<string, string>} [opts.headers]
 */
export async function cachedGetJson({
  path,
  accessToken,
  ttlMs = TTL_MS.DEFAULT_GET,
  onHttpError,
  select = (json) => json?.data ?? null,
  headers = {},
}) {
  const key = `v2:GET:${path}:${authCachePart(accessToken)}`
  const hit = cacheGet(key)
  if (hit !== undefined) return hit

  const url = `${API_BASE_URL}${path}`
  assertHttpsIfNeeded(url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { path, url } }))
  }
  const json = await readJson(response)
  if (!response.ok) {
    throw onHttpError(json, response)
  }
  const data = select(json)
  cacheSet(key, data, ttlMs)
  return data
}
