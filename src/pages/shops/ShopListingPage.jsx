import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { getRandomAvatarUrl } from '@/utils/avatarFallback'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import {
  selectSupermarketsListError,
  selectSupermarketsListItems,
  selectSupermarketsListMeta,
  selectSupermarketsListStatus,
} from '@/redux/slices/supermarketsSlice'
import { fetchSupermarketsAction } from '@/redux/thunks/supermarketsThunks'
import { useTheme } from '@/context/useTheme'
import '@/App.css'

function getInitials(value) {
  const cleaned = String(value ?? '').trim()
  if (!cleaned) return 'S'
  const parts = cleaned.split(/\s+/g).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

function ShopListingPage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  pageTitle = 'Shop Listing',
  caption = 'Manage and review registered shops',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createPath = '/dashboard/teamify/shops/create',
  reportsPath = '/dashboard/teamify/reports',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'
  const listItems = useSelector(selectSupermarketsListItems)
  const listMeta = useSelector(selectSupermarketsListMeta)
  const listStatus = useSelector(selectSupermarketsListStatus)
  const listError = useSelector(selectSupermarketsListError)
  const [copyToast, setCopyToast] = useState(null)
  const copyToastTimerRef = useRef(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [failedImageIds, setFailedImageIds] = useState(() => new Set())

  const showCopyToast = useCallback((message) => {
    if (copyToastTimerRef.current) {
      clearTimeout(copyToastTimerRef.current)
    }
    setCopyToast(message)
    copyToastTimerRef.current = setTimeout(() => {
      setCopyToast(null)
      copyToastTimerRef.current = null
    }, 2200)
  }, [])

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const parsedParams = useMemo(() => {
    const q = debouncedQuery
    if (!q) return { page, limit }

    const onlyDigits = /^[0-9]+$/.test(q)
    if (onlyDigits) {
      return { page, limit, user_id: Number(q) }
    }

    const shopIdLike = /^shop/i.test(q)
    if (shopIdLike) {
      return { page, limit, shop_id: q.toUpperCase() }
    }

    const phoneCandidate = q.replace(/\s+/g, '')
    const phoneLike = /^\+?[0-9]{6,}$/.test(phoneCandidate)
    if (phoneLike) {
      return { page, limit, phone: phoneCandidate }
    }

    return { page, limit, name: q }
  }, [debouncedQuery, limit, page])

  useEffect(() => {
    dispatch(fetchSupermarketsAction(parsedParams))
  }, [dispatch, parsedParams])

  useEffect(() => {
    const sample = (listItems ?? [])[0] ?? null
    const counts = (listItems ?? []).reduce(
      (acc, it) => {
        if (it?.photo_url) acc.photoUrl += 1
        if (it?.photo) acc.photo += 1
        return acc
      },
      { photoUrl: 0, photo: 0 },
    )
    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c70081'},body:JSON.stringify({sessionId:'c70081',runId:'listing-images-1',hypothesisId:'H1',location:'ShopListingPage.jsx:shops-map',message:'List sample fields',data:{hasItems:Array.isArray(listItems)&&listItems.length>0,count:Array.isArray(listItems)?listItems.length:0,counts,keys:sample?Object.keys(sample).slice(0,20):null,photo_url:sample?.photo_url??null,photo:sample?.photo??null,protocol:typeof window!=='undefined'?window.location.protocol:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [listItems])

  const shops = useMemo(() => {
    return (listItems ?? []).map((it) => ({
      photo_url: it.photo_url || null,
      photo: it.photo || null,
      shop_name: it.shop_name ?? '—',
      user_id: it.user_id ?? null,
      phone: it.phone ?? '—',
      location: it.location ?? '—',
      latitude: it.latitude ?? null,
      longitude: it.longitude ?? null,
    }))
  }, [listItems])

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'shops.view',
        paths: {
          dashboardPath,
          shopsPath,
          createShopPath: createPath,
          deliveryPartnersPath: '/dashboard/teamify/delivery-partners',
          reportsPath,
          accountsInvoicesPath:
            reportsPath === null
              ? '/portal/dashboard/accounts/invoices'
              : '/dashboard/teamify/accounts/invoices',
          accountsOverviewPath:
            reportsPath === null
              ? '/portal/dashboard/accounts/overview'
              : '/dashboard/teamify/accounts/overview',
          activityDailyPath:
            reportsPath === null
              ? null
              : '/dashboard/teamify/activity/daily',
          activitySalesPath:
            reportsPath === null
              ? null
              : '/dashboard/teamify/activity/sales',
        },
      }),
    [createPath, dashboardPath, navigate, reportsPath, shopsPath],
  )

  const handleCopy = async (value, label) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      showCopyToast(label)
    } catch {
      showCopyToast('Could not copy — try again')
    }
  }

  const isDark = themeMode === 'dark'
  const searchInputClass = isDark
    ? 'w-full rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm font-medium text-slate-100 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-black shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'
  const clearButtonClass = isDark
    ? 'rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm font-semibold text-slate-100 transition duration-200 hover:bg-slate-800'
    : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-slate-50'

  const copyIconClass = isDark
    ? 'h-3 w-3 object-contain invert opacity-100'
    : 'h-3 w-3 object-contain opacity-100'

  const copyButtonClass = isDark
    ? 'rounded-md border border-slate-700 bg-transparent p-1 transition-all duration-150 ease-out hover:bg-slate-800 hover:scale-[1.08] active:scale-[0.95]'
    : 'rounded-md border border-white/90 bg-slate-50/90 p-1 transition-all duration-150 ease-out hover:bg-slate-100 hover:scale-[1.08] active:scale-[0.95]'

  const detailPathFor = (userId) => {
    if (!userId) return null
    const base = shopsPath.endsWith('/shops') ? shopsPath : shopsPath
    return `${base}/${encodeURIComponent(String(userId))}`
  }

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
        {copyToast && (
          <div
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,360px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-black shadow-lg ring-1 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
            role="status"
            aria-live="polite"
          >
            {copyToast}
          </div>
        )}
        <header className="teamify-surface mb-3 rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 md:mb-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
            {brandTitle}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-black dark:text-slate-100 md:text-3xl">
            {pageTitle}
          </h2>
          <p className="mt-1 text-sm text-black dark:text-slate-300">{caption}</p>
        </header>

        <section className="teamify-surface mb-3 rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 md:mb-4 md:p-5">
          <label className="mb-2 block text-xs font-semibold text-black dark:text-slate-200">
            Search
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => {
                setPage(1)
                setQuery(e.target.value)
              }}
              placeholder="Search by name, phone, user id, or shop id"
              className={searchInputClass}
            />
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setQuery('')
              }}
              className={clearButtonClass}
            >
              Clear
            </button>
          </div>

          {listError ? (
            <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">
              {listError.message ?? 'Failed to load shops'}
            </p>
          ) : null}
        </section>

        {listStatus === 'loading' ? (
          <p className="mb-3 text-sm font-semibold text-black dark:text-slate-200">
            Loading shops...
          </p>
        ) : null}

        {listStatus !== 'loading' && shops.length === 0 ? (
          <div className="teamify-surface rounded-3xl p-8 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <p className="text-base font-semibold text-black dark:text-slate-100">
              No shops found
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Try a different search.
            </p>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shops.map((shop) => (
            <article
              key={shop.user_id ?? shop.shop_name}
              className="shop-flip-card group relative rounded-3xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="shop-flip-inner">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const next = detailPathFor(shop.user_id)
                    if (next) navigate(next)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      const next = detailPathFor(shop.user_id)
                      if (next) navigate(next)
                    }
                  }}
                  className="shop-flip-front teamify-surface block w-full text-left ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                >
                  {(() => {
                    const idKey = shop.user_id ?? shop.shop_name
                    const src =
                      shop.photo_url || (isHttpUrl(shop.photo) ? shop.photo : null)
                    const failed = failedImageIds.has(String(idKey))

                    // #region agent log
                    fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c70081'},body:JSON.stringify({sessionId:'c70081',runId:'listing-images-1',hypothesisId:'H2',location:'ShopListingPage.jsx:card-img',message:'Computed image src',data:{hasPhotoUrl:!!shop.photo_url,hasPhoto:!!shop.photo,photoIsHttp:isHttpUrl(shop.photo),srcIsHttp:isHttpUrl(src),srcNull:!src,alreadyFailed:failed},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion

                    if (!src || failed) {
                      return (
                        <img
                          src={getRandomAvatarUrl()}
                          alt="Avatar"
                          className="h-36 w-full object-cover"
                          loading="lazy"
                        />
                      )
                    }

                    return (
                      <img
                        src={src}
                        alt={shop.shop_name}
                        className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={() => {
                          // #region agent log
                          fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c70081'},body:JSON.stringify({sessionId:'c70081',runId:'listing-images-1',hypothesisId:'H3',location:'ShopListingPage.jsx:img-onError',message:'Image failed to load',data:{srcIsHttp:isHttpUrl(src),srcHost:typeof src==='string'?new URL(src, window.location.href).host:null,protocol:window.location.protocol},timestamp:Date.now()})}).catch(()=>{});
                          // #endregion
                          setFailedImageIds((prev) => {
                            const next = new Set(prev)
                            next.add(String(idKey))
                            return next
                          })
                        }}
                      />
                    )
                  })()}
                  <div className="space-y-1.5 p-3">
                    <h3 className="text-base font-semibold text-black dark:text-slate-100">
                      {shop.shop_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[14px] leading-5 font-medium text-black dark:text-slate-300">
                      <p className="truncate">
                        User ID: <span className="tabular-nums">{shop.user_id ?? '—'}</span>
                      </p>
                      <button
                        type="button"
                        aria-label={`Copy user id for ${shop.shop_name}`}
                        title="Copy User ID"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(
                            shop.user_id ? String(shop.user_id) : '',
                            shop.user_id ? `User ID copied: ${shop.user_id}` : 'Nothing to copy',
                          )
                        }}
                        className={copyButtonClass}
                      >
                        <img
                          src="/icons/copy.png"
                          alt=""
                          aria-hidden="true"
                          className={copyIconClass}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] leading-5 font-medium text-black dark:text-slate-300">
                      <p className="truncate">
                        Phone: <span className="tabular-nums">{shop.phone}</span>
                      </p>
                      <button
                        type="button"
                        aria-label={`Copy phone number for ${shop.shop_name}`}
                        title="Copy Phone Number"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(shop.phone, `Phone number copied: ${shop.phone}`)
                        }}
                        className={copyButtonClass}
                      >
                        <img
                          src="/icons/copy.png"
                          alt=""
                          aria-hidden="true"
                          className={copyIconClass}
                        />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="shop-flip-back teamify-surface flex flex-col justify-center p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">
                    Address
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-black dark:text-slate-100">
                    {shop.shop_name}
                  </h4>
                  <p className="mt-2 text-sm leading-5 text-black dark:text-slate-300">
                    {shop.location}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || listStatus === 'loading'}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-black transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Prev
          </button>
          <p className="text-sm font-semibold text-black dark:text-slate-200">
            Page {listMeta?.currentPage ?? page} / {listMeta?.totalPages ?? '—'}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={
              listStatus === 'loading' ||
              (listMeta?.totalPages ? page >= listMeta.totalPages : false)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-black transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default ShopListingPage
