/** Namespace fragment for cache keys so data never leaks across users. */
export function authCachePart(accessToken) {
  if (!accessToken) return 'anon'
  const t = String(accessToken)
  return t.length <= 28 ? t : `${t.slice(0, 14)}_${t.slice(-14)}`
}
