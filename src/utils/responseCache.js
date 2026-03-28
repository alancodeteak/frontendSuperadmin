/**
 * In-memory TTL cache for API responses. Survives React route changes; cleared when the
 * auth token is removed (see store.js) or via cacheClearAll().
 */
const entries = new Map()

export const TTL_MS = {
  /** Default for generic GET / JSON APIs (navigation cache). */
  DEFAULT_GET: 60_000,
  OPS_SNAPSHOT: 90_000,
  DAILY_OVERVIEW: 120_000,
  DAILY_TRENDS: 120_000,
  DAILY_SHOPS: 45_000,
}

export function cacheGet(key) {
  const e = entries.get(key)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) {
    entries.delete(key)
    return undefined
  }
  return e.value
}

export function cacheSet(key, value, ttlMs) {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cacheInvalidate(key) {
  entries.delete(key)
}

export function cacheClearAll() {
  entries.clear()
}
