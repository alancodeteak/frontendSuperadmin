import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { getRandomAvatarUrl } from '@/utils/avatarFallback'
import {
  selectDeliveryPartnersListError,
  selectDeliveryPartnersListItems,
  selectDeliveryPartnersListMeta,
  selectDeliveryPartnersListStatus,
} from '@/redux/slices/deliveryPartnersSlice'
import { fetchDeliveryPartnersAction } from '@/redux/thunks/deliveryPartnersThunks'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'
import '@/App.css'

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

function DeliveryPartnersListingPage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  shopsCreatePath = '/dashboard/teamify/shops/create',
  reportsPath = '/dashboard/teamify/reports',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const isDark = themeMode === 'dark'

  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'

  const items = useSelector(selectDeliveryPartnersListItems)
  const meta = useSelector(selectDeliveryPartnersListMeta)
  const status = useSelector(selectDeliveryPartnersListStatus)
  const error = useSelector(selectDeliveryPartnersListError)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10
  const [failedImgs, setFailedImgs] = useState(() => new Set())
  const [deletedFilter, setDeletedFilter] = useState('undeleted') // undeleted | deleted | all
  const [shopFilter, setShopFilter] = useState('all') // all | <shop_id>
  const [orderCountFilter, setOrderCountFilter] = useState('all') // all | zero | gt0
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const params = useMemo(
    () => {
      const q = String(debouncedQuery || '').trim()
      if (!q) return { page, limit }

      const onlyDigits = /^[0-9]+$/.test(q)
      if (onlyDigits) return { page, limit, phone: q }

      const dpLike = /^dp/i.test(q)
      if (dpLike) return { page, limit, delivery_partner_id: q.toUpperCase() }

      const shopIdLike = /^shop/i.test(q)
      if (shopIdLike) return { page, limit, shop_id: q.toUpperCase() }

      // Single-term search is more likely a shop name; multi-term looks like a person name.
      const isMultiTerm = /\s/.test(q)
      return isMultiTerm ? { page, limit, name: q } : { page, limit, shop_name: q }
    },
    [debouncedQuery, page],
  )

  useEffect(() => {
    dispatch(fetchDeliveryPartnersAction(params))
  }, [dispatch, params])

  const fallbackAvatarById = useMemo(() => {
    const map = {}
    for (const it of items ?? []) {
      const idKey = it?.delivery_partner_id ?? `${it?.shop_id}-${it?.phone}`
      if (!idKey) continue
      map[String(idKey)] = getRandomAvatarUrl()
    }
    return map
  }, [items])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'partners.deliveryPartners',
        paths: {
          dashboardPath,
          shopsPath,
          createShopPath: shopsCreatePath,
          deliveryPartnersPath: '/dashboard/teamify/delivery-partners',
          reportsPath,
          accountsInvoicesPath: '/dashboard/teamify/accounts/invoices',
          accountsOverviewPath: '/dashboard/teamify/accounts/overview',
        },
      }),
    [dashboardPath, navigate, reportsPath, shopsCreatePath, shopsPath],
  )

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const surface = isDark
    ? 'teamify-surface rounded-3xl ring-1 ring-slate-700 bg-slate-900'
    : 'teamify-surface rounded-3xl ring-1 ring-slate-200/70 bg-white'

  const subtle = isDark ? 'text-slate-300' : 'text-slate-700'
  const strong = isDark ? 'text-slate-100' : 'text-black'

  const searchClass = isDark
    ? 'w-full max-w-[420px] rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
    : 'w-full max-w-[420px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-black placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'

  const selectClass = isDark
    ? 'w-full rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
    : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'

  const ghostButtonClass = `rounded-xl border px-3 py-2 text-sm font-semibold transition ${
    isDark
      ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
  }`

  const hasActiveFilters =
    deletedFilter !== 'undeleted' ||
    shopFilter !== 'all' ||
    orderCountFilter !== 'all' ||
    Boolean(debouncedQuery)

  const clearAll = () => {
    setPage(1)
    setQuery('')
    setDeletedFilter('undeleted')
    setShopFilter('all')
    setOrderCountFilter('all')
    setFiltersOpen(false)
  }

  const shopOptions = useMemo(() => {
    const map = new Map()
    for (const it of items ?? []) {
      const shopId = it?.shop_id ? String(it.shop_id) : ''
      if (!shopId) continue
      const label = it?.shop_name ? `${it.shop_name} (${shopId})` : shopId
      if (!map.has(shopId)) map.set(shopId, label)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [items])

  const filteredItems = useMemo(() => {
    const list = items ?? []
    return list.filter((it) => {
      const isDeleted = Boolean(it?.is_deleted)
      if (deletedFilter === 'deleted' && !isDeleted) return false
      if (deletedFilter === 'undeleted' && isDeleted) return false

      const shopId = it?.shop_id ? String(it.shop_id) : ''
      if (shopFilter !== 'all' && shopId !== String(shopFilter)) return false

      const orders = Number(it?.order_count ?? NaN)
      if (orderCountFilter === 'zero') return Number.isFinite(orders) ? orders === 0 : false
      if (orderCountFilter === 'gt0') return Number.isFinite(orders) ? orders > 0 : false

      return true
    })
  }, [items, deletedFilter, shopFilter, orderCountFilter])

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle={sidebarSubTitle}
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="relative flex-1 rounded-3xl bg-slate-50 p-1 dark:bg-slate-950/40 sm:p-2">
        <header className="teamify-surface mb-3 rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 md:mb-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
            {brandTitle}
          </p>
          <h2 className={`mt-1 text-2xl font-semibold tracking-tight ${strong} md:text-3xl`}>
            Delivery Partners
          </h2>
          <p className={`mt-1 text-sm ${subtle}`}>Overview of registered delivery partners</p>
        </header>

        <section className={`${surface} mb-3 p-4 md:mb-4 md:p-5`}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              value={query}
              onChange={(e) => {
                setPage(1)
                setQuery(e.target.value)
              }}
              className={searchClass}
              placeholder="Search user, phone, shop"
            />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => setFiltersOpen((v) => !v)}
                >
                  Filters{filtersOpen ? ' ▲' : ' ▼'}
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={clearAll}
                  disabled={!hasActiveFilters}
                >
                  Clear
                </button>
              </div>
            </div>

            {hasActiveFilters ? (
              <p className={`text-xs font-semibold ${subtle}`}>
                Showing <span className={strong}>{filteredItems.length}</span> of{' '}
                <span className={strong}>{(items ?? []).length}</span> results
              </p>
            ) : null}

            {filtersOpen ? (
              <div className={`grid grid-cols-1 gap-2 md:grid-cols-3`}>
                <select
                  className={selectClass}
                  value={deletedFilter}
                  onChange={(e) => {
                    setPage(1)
                    setDeletedFilter(e.target.value)
                  }}
                  aria-label="Filter by deleted status"
                >
                  <option value="undeleted">Undeleted (default)</option>
                  <option value="deleted">Deleted</option>
                  <option value="all">All</option>
                </select>

                <select
                  className={selectClass}
                  value={shopFilter}
                  onChange={(e) => {
                    setPage(1)
                    setShopFilter(e.target.value)
                  }}
                  aria-label="Filter by shop"
                >
                  <option value="all">All shops</option>
                  {shopOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  className={selectClass}
                  value={orderCountFilter}
                  onChange={(e) => {
                    setPage(1)
                    setOrderCountFilter(e.target.value)
                  }}
                  aria-label="Filter by order count"
                >
                  <option value="all">All orders</option>
                  <option value="zero">Orders = 0</option>
                  <option value="gt0">Orders &gt; 0</option>
                </select>
              </div>
            ) : null}
          </div>
        </section>

        <section className={`${surface} p-0`}>
          <div className="overflow-hidden rounded-3xl">
            <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.8fr_0.9fr_0.6fr] gap-0 border-b border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-transparent dark:text-slate-400">
              <div>Partner</div>
              <div>Email/Phone</div>
              <div>Shop Name</div>
              <div>Status</div>
              <div>Partner ID</div>
              <div className="text-right">View</div>
            </div>

            {status === 'loading' ? (
              <div className={`px-4 py-4 text-sm font-semibold ${strong}`}>Loading...</div>
            ) : null}

            {error ? (
              <div className="px-4 py-4 text-sm font-semibold text-red-700 dark:text-red-300">
                {error.message ?? 'Failed to load delivery partners'}
              </div>
            ) : null}

            {status !== 'loading' && !error && (filteredItems ?? []).length === 0 ? (
              <div className={`px-4 py-10 text-center ${subtle}`}>
                No delivery partners found.
              </div>
            ) : null}

            {(filteredItems ?? []).map((it) => {
              const idKey = it.delivery_partner_id ?? `${it.shop_id}-${it.phone}`
              const src = it.photo_url || (isHttpUrl(it.photo) ? it.photo : null)
              const failed = failedImgs.has(String(idKey))
              const fallbackAvatar = fallbackAvatarById[String(idKey)] || getRandomAvatarUrl()
              return (
                <div
                  key={idKey}
                  className="grid grid-cols-[1.2fr_1fr_0.9fr_0.8fr_0.9fr_0.6fr] items-center gap-0 border-b border-slate-100 px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <div className="flex items-center gap-3">
                    {src && !failed ? (
                      <img
                        src={src}
                        alt={it.name ?? 'Delivery partner'}
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        loading="lazy"
                        onError={() => {
                          setFailedImgs((prev) => {
                            const next = new Set(prev)
                            next.add(String(idKey))
                            return next
                          })
                        }}
                      />
                    ) : (
                      <img
                        src={fallbackAvatar}
                        alt="Avatar"
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        loading="lazy"
                        onError={() => {}}
                      />
                    )}
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${strong}`}>{it.name ?? '—'}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            String(it?.online_status ?? '').toLowerCase() === 'online'
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <p className={`truncate text-xs ${subtle}`}>{it.phone ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div className={subtle}>{it.phone ?? '—'}</div>
                  <div className={strong}>{it.shop_name ?? '—'}</div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        String(it?.online_status ?? '').toLowerCase() === 'online'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200'
                      }`}
                    >
                      {String(it?.online_status ?? '').toLowerCase() === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className={`${subtle} tabular-nums`}>{it.delivery_partner_id ?? '—'}</div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const id = it?.delivery_partner_id
                        if (!id) return
                        navigate(
                          `/dashboard/teamify/delivery-partners/${encodeURIComponent(String(id))}`,
                        )
                      }}
                      className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                    >
                      View →
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="flex items-center justify-between px-4 py-3">
              <p className={`text-xs font-semibold ${subtle}`}>
                Page {meta?.currentPage ?? page} of {meta?.totalPages ?? '—'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || status === 'loading'}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={
                    status === 'loading' || (meta?.totalPages ? page >= meta.totalPages : false)
                  }
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default DeliveryPartnersListingPage

