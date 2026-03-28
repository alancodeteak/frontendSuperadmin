/** Public assets under `/shopIcon/` — used for map markers + legend. */

export const SHOP_MAP_ICON_URLS = {
  /** Default active supermarket */
  default: '/shopIcon/shop.png',
  /** Name contains “market” or similar retail */
  market: '/shopIcon/market.png',
  /** Fallback / non-active / needs attention */
  address: '/shopIcon/address.png',
  /** Blocked, suspended, or inactive */
  store: '/shopIcon/store%20(1).png',
}

/**
 * @param {object} shop — list row from `/supermarkets`
 * @returns {'default'|'market'|'address'|'store'}
 */
export function pickShopMapIconKey(shop) {
  const name = String(shop?.shop_name ?? '').toLowerCase()
  if (name.includes('market') || name.includes('bazaar')) return 'market'

  const st = String(shop?.status ?? '')
    .trim()
    .toUpperCase()
  if (st === 'ACTIVE' || st === '') return 'default'
  if (['BLOCKED', 'SUSPENDED', 'INACTIVE'].includes(st) || shop?.is_blocked === true) {
    return 'store'
  }
  return 'address'
}

export function getShopMapIconUrl(shop) {
  return SHOP_MAP_ICON_URLS[pickShopMapIconKey(shop)] ?? SHOP_MAP_ICON_URLS.default
}
