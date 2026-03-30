const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const REQUIRE_HTTPS = String(import.meta.env.VITE_REQUIRE_HTTPS ?? '').toLowerCase() === 'true'
export const UNAUTHORIZED_EVENT = 'yaadro:unauthorized'

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

function shouldRequireHttps() {
  if (REQUIRE_HTTPS) return true
  // default: enforce in production builds
  return String(import.meta.env.MODE).toLowerCase() === 'production'
}

function assertHttpsIfNeeded(url) {
  if (!shouldRequireHttps()) return
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') {
      throw new Error('Insecure API base URL (HTTPS required in production)')
    }
  } catch {
    throw new Error('Invalid API base URL')
  }
}

async function readJson(response) {
  return response.json().catch(() => null)
}

export function normalizeApiError(payload, fallbackMessage) {
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

export async function requestJson({ path, method = 'GET', accessToken, body, headers, onHttpError, timeoutMs = 30000 }) {
  const url = buildUrl(path)
  assertHttpsIfNeeded(url)

  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (response.status === 401 && typeof window !== 'undefined') {
      // Let the app centrally handle logout/redirect without coupling httpClient to Redux.
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { path, url } }))
    }
    const json = await readJson(response)
    if (!response.ok) {
      const err = onHttpError ? onHttpError(json, response) : normalizeApiError(json, 'Request failed')
      throw err
    }
    return json?.data ?? null
  } finally {
    window.clearTimeout(id)
  }
}

export async function requestRaw({ path, method = 'GET', accessToken, body, headers, onHttpError, timeoutMs = 30000 }) {
  const url = buildUrl(path)
  assertHttpsIfNeeded(url)

  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { path, url } }))
    }
    const json = await readJson(response)
    if (!response.ok) {
      const err = onHttpError ? onHttpError(json, response) : normalizeApiError(json, 'Request failed')
      throw err
    }
    return json
  } finally {
    window.clearTimeout(id)
  }
}

