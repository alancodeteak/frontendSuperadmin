import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
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

function initials(name) {
  const cleaned = String(name ?? '').trim()
  if (!cleaned) return 'DP'
  const parts = cleaned.split(/\s+/g).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

function DeliveryPartnersListingPage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  shopsCreatePath = '/dashboard/teamify/shops/create',
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const params = useMemo(
    () => ({
      page,
      limit,
      query: debouncedQuery || undefined,
    }),
    [debouncedQuery, page],
  )

  useEffect(() => {
    dispatch(fetchDeliveryPartnersAction(params))
  }, [dispatch, params])

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
        },
      }),
    [dashboardPath, navigate, shopsCreatePath, shopsPath],
  )

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const surface = isDark
    ? 'teamify-surface rounded-3xl ring-1 ring-slate-700 bg-slate-900'
    : 'teamify-surface rounded-3xl ring-1 ring-slate-200 bg-white'

  const subtle = isDark ? 'text-slate-300' : 'text-slate-600'
  const strong = isDark ? 'text-slate-100' : 'text-black'

  const searchClass = isDark
    ? 'w-full max-w-[420px] rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'
    : 'w-full max-w-[420px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-black placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'

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

      <main className="relative flex-1 rounded-3xl bg-white p-1 dark:bg-slate-950/40 sm:p-2">
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
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  isDark
                    ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-black hover:bg-slate-50'
                }`}
              >
                More filters
              </button>
            </div>
          </div>
        </section>

        <section className={`${surface} p-0`}>
          <div className="overflow-hidden rounded-3xl">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_0.6fr] gap-0 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <div>Partner</div>
              <div>Email/Phone</div>
              <div>Shop</div>
              <div>Shop ID</div>
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

            {status !== 'loading' && !error && (items ?? []).length === 0 ? (
              <div className={`px-4 py-10 text-center ${subtle}`}>
                No delivery partners found.
              </div>
            ) : null}

            {(items ?? []).map((it) => {
              const idKey = it.delivery_partner_id ?? `${it.shop_id}-${it.phone}`
              const src = it.photo_url || (isHttpUrl(it.photo) ? it.photo : null)
              const failed = failedImgs.has(String(idKey))
              return (
                <div
                  key={idKey}
                  className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_0.6fr] items-center gap-0 border-b border-slate-100 px-4 py-3 text-sm dark:border-slate-800"
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
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                        {initials(it.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${strong}`}>{it.name ?? '—'}</p>
                      <p className={`truncate text-xs ${subtle}`}>{it.phone ?? '—'}</p>
                    </div>
                  </div>
                  <div className={subtle}>{it.phone ?? '—'}</div>
                  <div className={strong}>{it.shop_name ?? '—'}</div>
                  <div className={`${subtle} tabular-nums`}>{it.shop_id ?? '—'}</div>
                  <div className={`${subtle} tabular-nums`}>{it.delivery_partner_id ?? '—'}</div>
                  <div className="text-right">
                    <button
                      type="button"
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
                      : 'border-slate-200 bg-white text-black hover:bg-slate-50'
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
                      : 'border-slate-200 bg-white text-black hover:bg-slate-50'
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

