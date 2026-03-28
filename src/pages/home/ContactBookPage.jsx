import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { listSupermarkets } from '@/apis/supermarketsApi'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function resolveImageUrl(value) {
  const v = String(value ?? '').trim()
  if (!v) return null
  if (isHttpUrl(v)) return v
  // common case: backend sends "/uploads/..." or similar
  if (v.startsWith('/')) return `${API_BASE_URL}${v}`
  return null
}

function initials(value) {
  const cleaned = String(value ?? '').trim()
  if (!cleaned) return 'S'
  const parts = cleaned.split(/\s+/g).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
}

function ShopContactAvatar({ shopName, avatarSrc }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = Boolean(avatarSrc) && !imgFailed

  useEffect(() => {
    setImgFailed(false)
  }, [avatarSrc])

  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-slate-800">
      {showPhoto ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {initials(shopName)}
        </div>
      )}
    </div>
  )
}

export default function ContactBookPage({
  brandTitle = 'Teamify',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createShopPath = '/dashboard/teamify/shops/create',
  reportsPath = '/dashboard/teamify/reports',
  invoicesPath = '/dashboard/teamify/accounts/invoices',
  overviewPath = '/dashboard/teamify/accounts/overview',
  contactBookPath = '/dashboard/teamify/contact-book',
  deliveryPartnersPath = '/dashboard/teamify/delivery-partners',
  activityDailyPath = '/dashboard/teamify/activity/daily',
  activitySalesPath = '/dashboard/teamify/activity/sales',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const accessToken = useSelector((state) => state.auth.session.accessToken)
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setLoading(true)
      try {
        // Backend: GET /supermarkets limit is capped at 100 (see supermarkets_routes.py)
        const limit = 100
        let page = 1
        let totalPages = 1
        const all = []

        while (page <= totalPages && all.length < 5000) {
          const res = await listSupermarkets({ page, limit }, { accessToken })
          if (cancelled) return
          const items = Array.isArray(res?.items) ? res.items : []
          const meta = res?.meta ?? null
          totalPages = Number(meta?.totalPages ?? totalPages) || totalPages
          all.push(...items)
          page += 1
          if (!items.length) break
        }

        setRows(
          all.map((r) => {
            const shopName = r?.shop_name ?? r?.shop_owner?.shop_name ?? r?.shopOwner?.shop_name ?? '—'
            const shopId = r?.shop_id ?? r?.shopId ?? r?.shop_owner?.shop_id ?? r?.shopOwner?.shop_id ?? ''
            const shopPhone =
              r?.phone ??
              r?.phone_number ??
              r?.phoneNumber ??
              r?.shop_owner?.phone ??
              r?.shopOwner?.phone ??
              ''
            const contactPhone =
              r?.contact_person_number ??
              r?.contactPersonNumber ??
              r?.shop_owner?.contact_person_number ??
              r?.shopOwner?.contact_person_number ??
              ''
            const userId = r?.user_id ?? r?.shop_owner?.user_id ?? r?.shopOwner?.user_id ?? ''
            const photoUrl = r?.photo_url ?? r?.photoUrl ?? null
            const photo = r?.photo ?? r?.shop_owner?.photo ?? r?.shopOwner?.photo ?? null
            const avatarSrc = resolveImageUrl(photoUrl) || resolveImageUrl(photo)

            return {
              shop_name: shopName,
              shop_id: shopId ? String(shopId) : '',
              phone: shopPhone ? String(shopPhone) : '',
              contact_phone: contactPhone ? String(contactPhone) : '',
              user_id: userId ? String(userId) : '',
              avatar_src: avatarSrc,
            }
          }),
        )
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const name = String(r.shop_name || '').toLowerCase()
      const phone = String(r.phone || '').toLowerCase()
      const uid = String(r.user_id || '').toLowerCase()
      return name.includes(q) || phone.includes(q) || uid.includes(q)
    })
  }, [query, rows])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'home.contactBook',
        paths: {
          dashboardPath,
          homeContactBookPath: contactBookPath,
          shopsPath,
          createShopPath,
          deliveryPartnersPath,
          reportsPath,
          accountsInvoicesPath: invoicesPath,
          accountsOverviewPath: overviewPath,
          activityDailyPath,
          activitySalesPath,
        },
      }),
    [
      activityDailyPath,
      activitySalesPath,
      contactBookPath,
      createShopPath,
      dashboardPath,
      deliveryPartnersPath,
      invoicesPath,
      navigate,
      overviewPath,
      reportsPath,
      shopsPath,
    ],
  )

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle="Contact Book"
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <main className="relative flex-1 rounded-3xl bg-white p-4 dark:bg-slate-950/40">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <header className="teamify-surface rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contact Book</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Shop-wise contact list from Shop Listing API.
            </p>
            <div className="mt-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by shop name, phone, user id..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
              />
            </div>
          </header>

          <section className="teamify-surface rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {loading ? 'Loading contacts...' : `Total contacts: ${filtered.length}`}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r, idx) => (
                <article
                  key={`${r.user_id || 'u'}-${idx}`}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="flex items-start gap-3">
                    <ShopContactAvatar shopName={r.shop_name} avatarSrc={r.avatar_src} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {r.shop_name || '—'}
                        </div>
                        <div className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          #{idx + 1}
                        </div>
                      </div>
                      {r.shop_id ? (
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          Shop ID: <span className="tabular-nums">{r.shop_id}</span>
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        UID: <span className="tabular-nums">{r.user_id || '—'}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-slate-800 dark:text-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate">
                            Shop: <span className="tabular-nums">{r.phone || '—'}</span>
                          </div>
                          {r.phone ? (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(String(r.phone)).catch(() => {})}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/55"
                              title="Copy shop phone"
                            >
                              Copy
                            </button>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate">
                            Contact: <span className="tabular-nums">{r.contact_phone || '—'}</span>
                          </div>
                          {r.contact_phone ? (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(String(r.contact_phone)).catch(() => {})}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/55"
                              title="Copy contact phone"
                            >
                              Copy
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!loading && !filtered.length ? (
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-800">
                No contacts found.
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </DashboardLayout>
  )
}

