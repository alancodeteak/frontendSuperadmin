import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { listSupermarkets } from '@/apis/supermarketsApi'
import { getShopMapIconUrl, SHOP_MAP_ICON_URLS } from '@/utils/shopMapIcons'

const DEFAULT_CENTER = { lat: 11.0168, lng: 76.9558 }
const ICON_SIZE = [38, 38]
const ICON_ANCHOR = [19, 38]

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points?.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
      return
    }
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(b, { padding: [48, 48], maxZoom: 13 })
  }, [map, points])
  return null
}

async function fetchAllShops(accessToken) {
  const limit = 100
  let page = 1
  const all = []
  for (;;) {
    const { items, meta } = await listSupermarkets({ page, limit }, { accessToken })
    const batch = Array.isArray(items) ? items : []
    all.push(...batch)
    const totalPages = meta?.totalPages ?? meta?.total_pages
    if (batch.length < limit) break
    if (totalPages != null && page >= totalPages) break
    page += 1
    if (page > 200) break
  }
  return all
}

function normalizeShopRow(raw) {
  const lat = raw?.latitude ?? raw?.address?.latitude
  const lng = raw?.longitude ?? raw?.address?.longitude
  return {
    shop_id: raw?.shop_id ?? '—',
    shop_name: raw?.shop_name ?? '—',
    user_id: raw?.user_id ?? null,
    phone: raw?.phone ?? '—',
    location: raw?.location ?? raw?.address?.street_address ?? '—',
    status: raw?.status ?? '',
    is_blocked: raw?.is_blocked,
    latitude: lat != null && lat !== '' ? Number(lat) : null,
    longitude: lng != null && lng !== '' ? Number(lng) : null,
    _raw: raw,
  }
}

export default function ShopsMapModal({
  isOpen,
  onClose,
  accessToken,
  themeMode,
  shopsBasePath,
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shops, setShops] = useState([])

  const load = useCallback(async () => {
    if (!accessToken) {
      setError('Not signed in.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await fetchAllShops(accessToken)
      setShops(rows.map(normalizeShopRow))
    } catch (e) {
      setError(e?.message ?? 'Could not load shops.')
      setShops([])
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (!isOpen) return
    void load()
  }, [isOpen, load])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const withCoords = useMemo(
    () => shops.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)),
    [shops],
  )
  const withoutCoords = useMemo(
    () => shops.filter((s) => !Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)),
    [shops],
  )

  const mapPoints = useMemo(
    () => withCoords.map((s) => ({ lat: s.latitude, lng: s.longitude })),
    [withCoords],
  )

  const center = useMemo(() => {
    if (!mapPoints.length) return DEFAULT_CENTER
    const lat = mapPoints.reduce((a, p) => a + p.lat, 0) / mapPoints.length
    const lng = mapPoints.reduce((a, p) => a + p.lng, 0) / mapPoints.length
    return { lat, lng }
  }, [mapPoints])

  const markers = useMemo(() => {
    return withCoords.map((shop) => ({
      shop,
      position: [shop.latitude, shop.longitude],
      icon: L.icon({
        iconUrl: getShopMapIconUrl(shop),
        iconSize: ICON_SIZE,
        iconAnchor: ICON_ANCHOR,
        popupAnchor: [0, -34],
        className: 'yaadro-shop-marker',
      }),
    }))
  }, [withCoords])

  const legend = [
    { key: 'default', label: 'Active shop', url: SHOP_MAP_ICON_URLS.default },
    { key: 'market', label: 'Market / name match', url: SHOP_MAP_ICON_URLS.market },
    { key: 'address', label: 'Other status', url: SHOP_MAP_ICON_URLS.address },
    { key: 'store', label: 'Inactive / blocked', url: SHOP_MAP_ICON_URLS.store },
  ]

  const detailHref = (userId) => {
    if (!userId || !shopsBasePath) return null
    const base = shopsBasePath.endsWith('/') ? shopsBasePath.slice(0, -1) : shopsBasePath
    return `${base}/${encodeURIComponent(String(userId))}`
  }

  if (!isOpen) return null

  const isDark = themeMode === 'dark'
  const panelClass = isDark
    ? 'border-slate-800 bg-slate-900 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900'
  const muted = isDark ? 'text-slate-400' : 'text-slate-600'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shops-map-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60"
        aria-label="Close map"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${panelClass}`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${
            isDark ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <div>
            <h2 id="shops-map-title" className="text-lg font-semibold">
              Shop locations
            </h2>
            <p className={`text-xs ${muted}`}>
              {loading
                ? 'Loading shops…'
                : `${withCoords.length} on map · ${withoutCoords.length} without coordinates · ${shops.length} total`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                isDark
                  ? 'border-slate-600 hover:bg-slate-800 disabled:opacity-50'
                  : 'border-slate-300 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                isDark
                  ? 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
          </div>
        </div>

        {error ? (
          <p className="px-4 py-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-[240px] flex-1 lg:min-h-[420px]">
            {loading ? (
              <div
                className={`flex h-full min-h-[240px] items-center justify-center text-sm ${muted}`}
              >
                Loading map…
              </div>
            ) : !loading && mapPoints.length === 0 ? (
              <div
                className={`flex h-full min-h-[240px] items-center justify-center text-sm ${muted}`}
              >
                No shops with latitude & longitude to pin yet.
              </div>
            ) : (
              <MapContainer
                key={markers.length ? `m-${markers.length}` : 'empty'}
                center={center}
                zoom={mapPoints.length ? 11 : 6}
                className="h-full min-h-[320px] w-full"
                style={{ minHeight: 320 }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapPoints.length ? <FitBounds points={mapPoints} /> : null}
                {markers.map(({ shop, position, icon }) => (
                  <Marker key={String(shop.shop_id)} position={position} icon={icon}>
                    <Popup>
                      <div className="min-w-[180px] text-sm">
                        <p className="font-semibold text-slate-900">{shop.shop_name}</p>
                        <p className="text-xs text-slate-600">
                          {shop.shop_id} · {String(shop.status || '—')}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{shop.location}</p>
                        <p className="text-xs text-slate-600">Phone: {shop.phone}</p>
                        {detailHref(shop.user_id) ? (
                          <button
                            type="button"
                            className="mt-2 text-left text-xs font-semibold text-indigo-600 hover:underline"
                            onClick={() => {
                              onClose()
                              navigate(detailHref(shop.user_id))
                            }}
                          >
                            Open shop detail
                          </button>
                        ) : null}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          <aside
            className={`flex max-h-[40vh] w-full flex-col gap-2 overflow-y-auto border-t p-3 lg:max-h-none lg:w-56 lg:border-l lg:border-t-0 ${
              isDark ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Legend
            </p>
            <ul className="space-y-2">
              {legend.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-xs">
                  <img
                    src={item.url}
                    alt=""
                    className="h-8 w-8 shrink-0 object-contain"
                    style={{ width: 38, height: 38 }}
                  />
                  <span className={muted}>{item.label}</span>
                </li>
              ))}
            </ul>
            {withoutCoords.length > 0 ? (
              <>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  No coordinates ({withoutCoords.length})
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-400">
                  {withoutCoords.slice(0, 40).map((s) => (
                    <li key={String(s.shop_id)} className="truncate">
                      {s.shop_name} ({s.shop_id})
                    </li>
                  ))}
                  {withoutCoords.length > 40 ? (
                    <li className="text-slate-500">…and {withoutCoords.length - 40} more</li>
                  ) : null}
                </ul>
              </>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}
