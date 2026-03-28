import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import StatCard from '@/components/common/StatCard'
import TeamMemberRow from '@/components/common/TeamMemberRow'
import { setSelectedRange } from '@/redux/slices/dashboardSlice'
import { logoutLocal } from '@/redux/slices/authSlice'
import { getDashboardData } from '@/redux/thunks/dashboardThunks'
import { logoutAction } from '@/redux/thunks/authThunks'
import { listSupermarkets } from '@/apis/supermarketsApi'
import {
  getReportsDeliveryPartners,
  getReportsFunnel,
  getReportsOverview,
} from '@/apis/reportsApi'
import { getAdminAccountsOverview, getPortalAccountsOverview } from '@/apis/invoicesApi'
import { useTheme } from '@/context/useTheme'
import { buildOperationsSnapshot } from '@/utils/operationsSnapshot'
import { getAvatarUrlForKey } from '@/utils/avatarFallback'
import ShopsMapModal from '@/components/shops/ShopsMapModal'
import '@/App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

function resolveContactImageUrl(value) {
  const v = String(value ?? '').trim()
  if (!v) return null
  if (isHttpUrl(v)) return v
  if (v.startsWith('/')) return `${API_BASE_URL}${v}`
  return null
}

function contactInitials(value) {
  const cleaned = String(value ?? '').trim()
  if (!cleaned) return 'S'
  const parts = cleaned.split(/\s+/g).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
}

/** Portal dashboard: subscription invoice overview (JWT-scoped on the backend). */
function buildPortalOperationsSnapshot(overview) {
  if (!overview) return null
  const k = overview.kpis ?? {}
  return {
    kind: 'portal',
    windowDays: Number(overview.window_days ?? 30),
    collectedAmount: Number(k.collected_amount ?? 0),
    toCollectAmount: Number(k.to_collect_amount ?? 0),
    overdueShops: Number(k.overdue_shops ?? 0),
    pendingShops: Number(k.pending_shops ?? 0),
    overdueInvoices: Number(k.overdue_invoices ?? 0),
    pendingInvoices: Number(k.pending_invoices ?? 0),
  }
}

/** Clamp to 0–100 for activity rings. */
function clampPct(n) {
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Three independent ring values (outer → inner) from operations snapshot.
 * Admin: delivery completion, fewer shops idle, fewer partners idle.
 * Portal: collection share, invoice backlog pressure, shop overdue/pending pressure.
 */
function computeActivityRings(snapshot) {
  if (!snapshot) return null
  if (snapshot.kind === 'portal') {
    const collected = Number(snapshot.collectedAmount ?? 0)
    const toCollect = Number(snapshot.toCollectAmount ?? 0)
    const denom = collected + toCollect
    const outer = denom > 0 ? clampPct((100 * collected) / denom) : 100

    const inv = Number(snapshot.pendingInvoices ?? 0) + Number(snapshot.overdueInvoices ?? 0)
    const middle = clampPct(100 - Math.min(100, inv * 2))

    const shops = Number(snapshot.pendingShops ?? 0) + Number(snapshot.overdueShops ?? 0)
    const inner = clampPct(100 - Math.min(100, shops * 8))

    return {
      outer,
      middle,
      inner,
      center: clampPct((outer + middle + inner) / 3),
      labels: {
        outer: 'Collection',
        middle: 'Invoice clarity',
        inner: 'Shop health',
      },
    }
  }
  if (snapshot.kind === 'admin') {
    const td = Number(snapshot.totalDeliveries ?? 0)
    const pend = snapshot.deliveriesPending != null ? Number(snapshot.deliveriesPending) : null
    let outer = 100
    if (pend != null && td + pend > 0) {
      outer = clampPct((100 * td) / (td + pend))
    }

    const snu = Number(snapshot.shopsNotUsing ?? 0)
    const middle = clampPct(100 - Math.min(100, snu * 2))

    let inner = middle
    if (snapshot.partnersNotUsing != null) {
      const pnu = Number(snapshot.partnersNotUsing)
      inner = clampPct(100 - Math.min(100, pnu * 2))
    }

    return {
      outer,
      middle,
      inner,
      center: clampPct((outer + middle + inner) / 3),
      labels: {
        outer: 'Delivery',
        middle: 'Shop engagement',
        inner: 'Partner engagement',
      },
    }
  }
  return null
}

const ranges = ['daily', 'weekly', 'monthly']
const chartDataByRange = {
  daily: [
    { name: 'Mon', tasks: 22, productivity: 61 },
    { name: 'Tue', tasks: 30, productivity: 70 },
    { name: 'Wed', tasks: 26, productivity: 66 },
    { name: 'Thu', tasks: 35, productivity: 78 },
    { name: 'Fri', tasks: 40, productivity: 83 },
    { name: 'Sat', tasks: 28, productivity: 71 },
    { name: 'Sun', tasks: 24, productivity: 63 },
  ],
  weekly: [
    { name: 'W1', tasks: 160, productivity: 64 },
    { name: 'W2', tasks: 188, productivity: 72 },
    { name: 'W3', tasks: 176, productivity: 69 },
    { name: 'W4', tasks: 206, productivity: 81 },
  ],
  monthly: [
    { name: 'Jan', tasks: 690, productivity: 66 },
    { name: 'Feb', tasks: 740, productivity: 71 },
    { name: 'Mar', tasks: 802, productivity: 76 },
    { name: 'Apr', tasks: 768, productivity: 73 },
    { name: 'May', tasks: 846, productivity: 79 },
    { name: 'Jun', tasks: 882, productivity: 83 },
  ],
}

function DashboardContactRow({ contact, rowIndex = 0 }) {
  const [apiAvatarFailed, setApiAvatarFailed] = useState(false)
  const [pooledAvatarFailed, setPooledAvatarFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const avatarSrc = contact.avatar_src
  const pooledAvatarUrl = useMemo(
    () => getAvatarUrlForKey(String(contact.user_id ?? contact.shop_name ?? rowIndex)),
    [contact.user_id, contact.shop_name, rowIndex],
  )

  useEffect(() => {
    setApiAvatarFailed(false)
    setPooledAvatarFailed(false)
  }, [avatarSrc, pooledAvatarUrl])

  const showApiPhoto = Boolean(avatarSrc) && !apiAvatarFailed
  const showPooledPhoto = !showApiPhoto && !pooledAvatarFailed

  const handleCopy = useCallback(async () => {
    if (!contact.phone) return
    try {
      await navigator.clipboard.writeText(String(contact.phone))
      setCopied(true)
    } catch {
      /* ignore */
    }
  }, [contact.phone])

  useEffect(() => {
    if (!copied) return undefined
    const id = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [copied])

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:ring-slate-800">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          {showApiPhoto || showPooledPhoto ? (
            <img
              src={showApiPhoto ? avatarSrc : pooledAvatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => {
                if (showApiPhoto) setApiAvatarFailed(true)
                else setPooledAvatarFailed(true)
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {contactInitials(contact.shop_name)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{contact.shop_name}</div>
          <div className="truncate text-xs text-slate-600 dark:text-slate-300">
            {contact.phone || 'No phone'}
          </div>
        </div>
      </div>
      {contact.phone ? (
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
            copied
              ? 'border-emerald-500/60 bg-emerald-50 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-950/50 dark:text-emerald-200'
              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/55'
          }`}
          title={copied ? 'Copied' : 'Copy phone'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      ) : null}
    </div>
  )
}

function TeamDashboardPage({
  brandTitle = 'Teamify',
  pageTitle = 'Team Dashboard',
  logoutRedirectTo = '/',
  /** Sidebar "Home → Dashboard" target; must match portal vs admin routes. */
  dashboardPath = '/dashboard/teamify',
  shopsPagePath = '/dashboard/teamify/shops',
  reportsPath = '/dashboard/teamify/reports',
  contactBookPath = '/dashboard/teamify/contact-book',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { stats, members, loading, selectedRange } = useSelector(
    (state) => state.dashboard,
  )
  const { logoutStatus } = useSelector((state) => state.auth)
  const accessToken = useSelector((state) => state.auth.session.accessToken)
  const { themeMode, toggleTheme } = useTheme()
  const [contactRows, setContactRows] = useState([])
  const [contactsMeta, setContactsMeta] = useState(null)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [reportToday, setReportToday] = useState(null)
  const [reportMonthly, setReportMonthly] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [shopsMapOpen, setShopsMapOpen] = useState(false)
  const operationsCardRef = useRef(null)
  const [isLgLayout, setIsLgLayout] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  const [operationsCardHeightPx, setOperationsCardHeightPx] = useState(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsLgLayout(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useLayoutEffect(() => {
    if (!isLgLayout) {
      setOperationsCardHeightPx(null)
      return
    }
    const el = operationsCardRef.current
    if (!el) return

    const measure = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) setOperationsCardHeightPx(h)
    }

    const ro = new ResizeObserver(() => {
      measure()
    })
    ro.observe(el)
    measure()
    const raf = requestAnimationFrame(() => measure())

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [
    isLgLayout,
    reportToday,
    reportMonthly,
    reportLoading,
    reportError,
    contactRows.length,
  ])

  const contactBookCardStyle =
    isLgLayout && operationsCardHeightPx != null
      ? {
          height: operationsCardHeightPx,
          maxHeight: operationsCardHeightPx,
          minHeight: 0,
          boxSizing: 'border-box',
        }
      : undefined

  useEffect(() => {
    dispatch(getDashboardData())
  }, [dispatch])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setContactsLoading(true)
      try {
        const res = await listSupermarkets({ page: 1, limit: 100 }, { accessToken })
        if (cancelled) return
        const items = Array.isArray(res?.items) ? res.items : []
        setContactRows(
          items.map((r) => {
            const photoUrl = r?.photo_url ?? r?.photoUrl ?? null
            const photo = r?.photo ?? r?.shop_owner?.photo ?? r?.shopOwner?.photo ?? null
            const avatar_src = resolveContactImageUrl(photoUrl) || resolveContactImageUrl(photo)
            return {
              shop_name: r?.shop_name ?? r?.shop_owner?.shop_name ?? r?.shopOwner?.shop_name ?? '—',
              phone: r?.phone ?? r?.shop_owner?.phone ?? r?.shopOwner?.phone ?? '',
              user_id: r?.user_id ?? r?.shop_owner?.user_id ?? r?.shopOwner?.user_id ?? '',
              avatar_src,
            }
          }),
        )
        setContactsMeta(res?.meta ?? null)
      } catch {
        if (!cancelled) {
          setContactRows([])
          setContactsMeta(null)
        }
      } finally {
        if (!cancelled) setContactsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setReportLoading(true)
      setReportError('')
      try {
        if (reportsPath === null) {
          const settled = await Promise.allSettled([
            getPortalAccountsOverview({ days: 1 }, { accessToken }),
            getPortalAccountsOverview({ days: 30 }, { accessToken }),
          ])
          if (cancelled) return
          const d1 = settled[0].status === 'fulfilled' ? settled[0].value : null
          const d30 = settled[1].status === 'fulfilled' ? settled[1].value : null
          const partial = settled.some((r) => r.status === 'rejected')
          if (partial) {
            setReportError('Some figures could not be loaded; numbers below may be incomplete.')
          } else {
            setReportError('')
          }
          if (!d1 && !d30) {
            setReportToday(null)
            setReportMonthly(null)
            setReportError('Could not load subscription overview.')
            return
          }
          setReportToday(d1 ? buildPortalOperationsSnapshot(d1) : null)
          setReportMonthly(d30 ? buildPortalOperationsSnapshot(d30) : null)
          return
        }

        const settled = await Promise.allSettled([
          getReportsOverview({ days: 1 }, { accessToken }),
          getReportsOverview({ days: 30 }, { accessToken }),
          getReportsFunnel({ days: 1 }, { accessToken }),
          getReportsFunnel({ days: 30 }, { accessToken }),
          getAdminAccountsOverview({ days: 30 }, { accessToken }),
          getReportsDeliveryPartners({ days: 1, limit: 100 }, { accessToken }),
          getReportsDeliveryPartners({ days: 30, limit: 100 }, { accessToken }),
        ])
        if (cancelled) return

        const ov1 = settled[0].status === 'fulfilled' ? settled[0].value : null
        const ov30 = settled[1].status === 'fulfilled' ? settled[1].value : null
        const funnel1 = settled[2].status === 'fulfilled' ? settled[2].value : null
        const funnel30 = settled[3].status === 'fulfilled' ? settled[3].value : null
        const acct = settled[4].status === 'fulfilled' ? settled[4].value : null
        const dp1 = settled[5].status === 'fulfilled' ? settled[5].value : null
        const dp30 = settled[6].status === 'fulfilled' ? settled[6].value : null

        const partial = settled.some((r) => r.status === 'rejected')
        if (partial) {
          setReportError('Some figures could not be loaded; numbers below may be incomplete.')
        } else {
          setReportError('')
        }

        if (!ov1 && !ov30) {
          setReportToday(null)
          setReportMonthly(null)
          setReportError('Could not load analytics.')
          return
        }

        setReportToday(ov1 ? buildOperationsSnapshot(ov1, funnel1, dp1, acct) : null)
        setReportMonthly(ov30 ? buildOperationsSnapshot(ov30, funnel30, dp30, acct) : null)
      } catch {
        if (!cancelled) {
          setReportToday(null)
          setReportMonthly(null)
          setReportError(
            reportsPath === null
              ? 'Could not load subscription overview.'
              : 'Could not load reports. Check your connection and try again.',
          )
        }
      } finally {
        if (!cancelled) setReportLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [accessToken, reportsPath])

  const mixedChartData = chartDataByRange[selectedRange]
  const axisTickColor = themeMode === 'dark' ? '#cbd5e1' : '#000000'
  const gridColor = themeMode === 'dark' ? '#334155' : '#d9deea'
  const tooltipStyle = {
    borderRadius: '12px',
    border: themeMode === 'dark' ? '1px solid #334155' : '1px solid #d9deea',
    backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
    color: themeMode === 'dark' ? '#f1f5f9' : '#000000',
    boxShadow:
      themeMode === 'dark'
        ? '0 8px 20px rgba(2,6,23,0.45)'
        : '0 8px 20px rgba(15,23,42,0.1)',
  }

  const ringMetrics = useMemo(() => {
    const snapshot = selectedRange === 'daily' ? reportToday : reportMonthly
    const computed = computeActivityRings(snapshot)
    const track = themeMode === 'dark' ? '#334155' : '#e2e8f0'
    if (computed) {
      return { ...computed, track, fallback: false }
    }
    if (!members.length) {
      return {
        outer: 0,
        middle: 0,
        inner: 0,
        center: 0,
        labels: { outer: '—', middle: '—', inner: '—' },
        track,
        fallback: true,
      }
    }
    const avg = Math.round(members.reduce((sum, m) => sum + m.progress, 0) / members.length)
    return {
      outer: avg,
      middle: Math.max(avg - 8, 0),
      inner: Math.max(avg - 16, 0),
      center: avg,
      labels: { outer: 'Team', middle: 'Team', inner: 'Team' },
      track,
      fallback: true,
    }
  }, [selectedRange, reportToday, reportMonthly, members, themeMode])

  const ringPeriodLabel = selectedRange === 'daily' ? 'Today' : '30-day'
  const ringBlurb =
    reportsPath === null
      ? 'Collection vs outstanding, invoice backlog, shop flags — '
      : 'Deliveries vs pending pipeline, shops with orders, partners with orders — '
  const rangeContainerClass =
    themeMode === 'dark'
      ? 'relative inline-flex w-full max-w-full rounded-xl bg-slate-800 p-1 md:w-auto'
      : 'relative inline-flex w-full max-w-full rounded-xl bg-white p-1 ring-1 ring-slate-300 md:w-auto'
  const isLoggingOut = logoutStatus === 'loading'

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
        activeKey: 'home.dashboard',
        paths: {
          dashboardPath,
          homeContactBookPath: contactBookPath,
          shopsPath: shopsPagePath,
          createShopPath: `${shopsPagePath}/create`,
          deliveryPartnersPath:
            reportsPath === null ? null : '/dashboard/teamify/delivery-partners',
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
    [contactBookPath, dashboardPath, navigate, reportsPath, shopsPagePath],
  )

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle={pageTitle}
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="min-h-0 flex-1 rounded-3xl bg-white p-1 dark:bg-slate-950/40 sm:p-2">
        <header className="teamify-surface mb-3 rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4 md:mb-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-black dark:text-slate-100 sm:text-2xl md:text-3xl">
                {pageTitle}
              </h2>
              <p className="mt-1 text-sm text-black dark:text-slate-300">
                Welcome back, monitor your team performance in real time.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setShopsMapOpen(true)}
                disabled={!accessToken}
                className={`inline-flex shrink-0 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  themeMode === 'dark'
                    ? 'border-indigo-500/50 bg-slate-900/60 text-indigo-200 hover:bg-slate-800'
                    : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
                }`}
              >
                Shop locations
              </button>
              <div className={`min-w-0 flex-1 sm:max-w-md ${rangeContainerClass}`}>
                <span
                  className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out ${
                    themeMode === 'dark' ? 'bg-slate-700 shadow-sm' : 'bg-indigo-600 shadow-sm'
                  }`}
                  style={{
                    width: 'calc((100% - 0.5rem) / 3)',
                    transform: `translateX(calc(${ranges.indexOf(selectedRange)} * 100%))`,
                  }}
                />
                {ranges.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => dispatch(setSelectedRange(range))}
                    className={`relative z-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all duration-300 ease-out hover:-translate-y-0.5 md:px-4 ${
                      selectedRange === range
                        ? themeMode === 'dark'
                          ? 'text-slate-100'
                          : 'text-white'
                        : themeMode === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700/60'
                          : 'text-black hover:bg-slate-100'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.id} {...item} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.32fr_0.9fr]">
          <article className="teamify-surface rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4 md:p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-slate-100">
                Team Performance
              </h3>
              <span className="text-sm text-black dark:text-slate-300">
                {selectedRange} report
              </span>
            </div>

            <div className="teamify-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mixedChartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: axisTickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisTickColor, fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="tasks" barSize={selectedRange === 'monthly' ? 18 : 20} fill="#818cf8" radius={[8, 8, 0, 0]} />
                  <Area
                    dataKey="productivity"
                    type="monotone"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fill="rgba(14,165,233,0.18)"
                    dot={{ r: 3, strokeWidth: 0, fill: '#0284c7' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="teamify-surface rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4 md:p-5">
            <h3 className="text-lg font-semibold text-black dark:text-slate-100">
              Operations health
            </h3>
            <p className="mt-1 text-sm text-black dark:text-slate-300">
              {ringBlurb}
              <span className="font-medium text-slate-700 dark:text-slate-200">{ringPeriodLabel}</span>
              {ringMetrics.fallback ? (
                <span className="block pt-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {reportLoading
                    ? 'Loading live metrics…'
                    : members.length
                      ? 'Live snapshot unavailable — using team progress demo.'
                      : 'No live snapshot yet.'}
                </span>
              ) : null}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <li>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">●</span>{' '}
                {ringMetrics.labels.outer}{' '}
                <span className="tabular-nums text-slate-800 dark:text-slate-200">{ringMetrics.outer}%</span>
              </li>
              <li>
                <span className="font-semibold text-sky-600 dark:text-sky-400">●</span>{' '}
                {ringMetrics.labels.middle}{' '}
                <span className="tabular-nums text-slate-800 dark:text-slate-200">{ringMetrics.middle}%</span>
              </li>
              <li>
                <span className="font-semibold text-amber-600 dark:text-amber-400">●</span>{' '}
                {ringMetrics.labels.inner}{' '}
                <span className="tabular-nums text-slate-800 dark:text-slate-200">{ringMetrics.inner}%</span>
              </li>
            </ul>

            <div className="teamify-ring-wrap mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Outer', value: ringMetrics.outer, fill: '#34c759' },
                      { name: 'OuterRem', value: 100 - ringMetrics.outer, fill: ringMetrics.track },
                    ]}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius="66%"
                    outerRadius="88%"
                    strokeWidth={0}
                  />
                  <Pie
                    data={[
                      { name: 'Mid', value: ringMetrics.middle, fill: '#0ea5e9' },
                      { name: 'MidRem', value: 100 - ringMetrics.middle, fill: ringMetrics.track },
                    ]}
                    dataKey="value"
                    startAngle={100}
                    endAngle={-260}
                    innerRadius="48%"
                    outerRadius="61%"
                    strokeWidth={0}
                  />
                  <Pie
                    data={[
                      { name: 'Inner', value: ringMetrics.inner, fill: '#f59e0b' },
                      { name: 'InnerRem', value: 100 - ringMetrics.inner, fill: ringMetrics.track },
                    ]}
                    dataKey="value"
                    startAngle={110}
                    endAngle={-250}
                    innerRadius="32%"
                    outerRadius="43%"
                    strokeWidth={0}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="teamify-ring-center">
                <div className="teamify-ring-value">
                  <strong className="text-2xl font-semibold text-black dark:text-slate-100">
                    {ringMetrics.center}%
                  </strong>
                  <span className="text-xs text-black dark:text-slate-300">
                    {ringMetrics.fallback ? 'Team avg' : 'Health'}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-3 mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch lg:gap-4 md:mb-4 md:mt-4 lg:min-h-0">
          <div
            className="teamify-surface flex min-h-0 w-full flex-col overflow-hidden rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-3 md:p-4 lg:col-span-1"
            style={contactBookCardStyle}
          >
            <div className="mb-2 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                Home
              </p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-sm font-semibold text-black dark:text-slate-100">Contact Book</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {contactsLoading
                    ? 'Loading…'
                    : contactsMeta?.total != null
                      ? `${contactsMeta.total} shop${contactsMeta.total === 1 ? '' : 's'}`
                      : contactRows.length
                        ? `${contactRows.length} shown`
                        : '—'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                First page of shops — copy phones or open the full directory.
              </p>
            </div>
            <div
              className={`min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 ${contactBookCardStyle ? 'flex-1' : ''} ${isLgLayout && !contactBookCardStyle ? 'max-h-[min(12rem,32vh)]' : ''}`}
            >
              {contactsLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading contacts…</p>
              ) : (
                contactRows.map((c, idx) => (
                  <DashboardContactRow key={`${c.user_id ?? 'u'}-${idx}`} contact={c} rowIndex={idx} />
                ))
              )}
              {!contactsLoading && !contactRows.length ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No shops to show.</p>
              ) : null}
            </div>
            {contactBookPath ? (
              <button
                type="button"
                onClick={() => navigate(contactBookPath)}
                className="mt-2 w-full shrink-0 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-900/55"
              >
                Open full contact book
              </button>
            ) : null}
          </div>

          <div
            ref={operationsCardRef}
            className="teamify-surface flex w-full flex-col rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-3 md:p-4 lg:col-span-2 lg:min-h-0 lg:self-start"
          >
            <div className="mb-2 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Operations
              </p>
              <h3 className="mt-0.5 text-sm font-semibold text-black dark:text-slate-100">
                Today
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {reportsPath === null
                  ? 'Subscription invoices for your shop: short window vs last 30 days. Pending and overdue counts are current.'
                  : 'Last 24 hours first; 30-day context below. Subscription backlog is current.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 pr-0.5">
              {reportLoading ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading report…</p>
              ) : !reportToday && !reportMonthly && reportError ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">{reportError}</p>
              ) : (
                <>
                  {reportError ? (
                    <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800">
                      {reportError}
                    </p>
                  ) : null}

                  {reportToday?.kind === 'portal' ? (
                    <div className="space-y-1.5 rounded-xl bg-slate-50/80 p-2.5 ring-1 ring-slate-200 dark:bg-slate-900/30 dark:ring-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                        Last {reportToday.windowDays} day{reportToday.windowDays === 1 ? '' : 's'}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {reportToday.collectedAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>{' '}
                        collected ·{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {reportToday.toCollectAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>{' '}
                        outstanding (pending + overdue)
                      </p>
                      <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {reportToday.pendingInvoices.toLocaleString()}
                        </span>{' '}
                        pending invoices ·{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {reportToday.overdueInvoices.toLocaleString()}
                        </span>{' '}
                        overdue
                      </p>
                      {(reportToday.pendingShops > 0 || reportToday.overdueShops > 0) && (
                        <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {reportToday.pendingShops > 0
                              ? `${reportToday.pendingShops} pending shop(s)`
                              : null}
                            {reportToday.pendingShops > 0 && reportToday.overdueShops > 0 ? ' · ' : null}
                            {reportToday.overdueShops > 0
                              ? `${reportToday.overdueShops} overdue shop(s)`
                              : null}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : reportToday ? (
                    <div className="space-y-1.5 rounded-xl bg-slate-50/80 p-2.5 ring-1 ring-slate-200 dark:bg-slate-900/30 dark:ring-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                        Today · last 24 hours
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {reportToday.totalOrders.toLocaleString()}
                        </span>{' '}
                        orders ·{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {reportToday.totalAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>{' '}
                        revenue ·{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {reportToday.totalDeliveries.toLocaleString()}
                        </span>{' '}
                        marked delivered
                      </p>
                      <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {reportToday.shopsNotUsing}
                        </span>{' '}
                        shops had no orders today.
                      </p>
                      {reportToday.shopsPaymentPending != null ? (
                        <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {reportToday.shopsPaymentPending}
                          </span>{' '}
                          shops — subscription payment pending or overdue (current).
                        </p>
                      ) : null}
                      {reportToday.partnersNotUsing != null ? (
                        <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {reportToday.partnersNotUsing}
                          </span>{' '}
                          delivery partners had no orders today.
                          {reportToday.partnerSampleCapped ? (
                            <span className="block pt-0.5 text-[10px] text-slate-500">
                              Partner counts may be approximate when many partners are active.
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {reportToday.deliveriesPending != null ? (
                        <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {reportToday.deliveriesPending}
                          </span>{' '}
                          deliveries pending (today&apos;s pipeline).
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Today&apos;s snapshot unavailable.
                    </p>
                  )}

                  {reportMonthly?.kind === 'portal' ? (
                    <div className="space-y-1.5 rounded-xl border border-dashed border-slate-200/90 p-2.5 dark:border-slate-600/80">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                        Last {reportMonthly.windowDays} days
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reportMonthly.collectedAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>{' '}
                        collected ·{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reportMonthly.toCollectAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>{' '}
                        outstanding (pending + overdue)
                      </p>
                      <p className="text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-300">
                          {reportMonthly.pendingInvoices.toLocaleString()}
                        </span>{' '}
                        pending invoices ·{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-300">
                          {reportMonthly.overdueInvoices.toLocaleString()}
                        </span>{' '}
                        overdue
                      </p>
                      {(reportMonthly.pendingShops > 0 || reportMonthly.overdueShops > 0) && (
                        <p className="text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-300">
                            {reportMonthly.pendingShops > 0
                              ? `${reportMonthly.pendingShops} pending shop(s)`
                              : null}
                            {reportMonthly.pendingShops > 0 && reportMonthly.overdueShops > 0
                              ? ' · '
                              : null}
                            {reportMonthly.overdueShops > 0
                              ? `${reportMonthly.overdueShops} overdue shop(s)`
                              : null}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : reportMonthly ? (
                    <div className="space-y-1.5 rounded-xl border border-dashed border-slate-200/90 p-2.5 dark:border-slate-600/80">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                        30-day context
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reportMonthly.totalOrders.toLocaleString()}
                        </span>{' '}
                        orders ·{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reportMonthly.totalAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>{' '}
                        revenue ·{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reportMonthly.totalDeliveries.toLocaleString()}
                        </span>{' '}
                        delivered
                        {reportMonthly.growth?.orders_pct_vs_prev_period != null ? (
                          <span className="block pt-1 text-[10px] text-slate-500">
                            vs prior 30 days: orders{' '}
                            {reportMonthly.growth.orders_pct_vs_prev_period >= 0 ? '+' : ''}
                            {reportMonthly.growth.orders_pct_vs_prev_period}% · amount{' '}
                            {reportMonthly.growth.amount_pct_vs_prev_period != null
                              ? `${reportMonthly.growth.amount_pct_vs_prev_period >= 0 ? '+' : ''}${reportMonthly.growth.amount_pct_vs_prev_period}%`
                              : '—'}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-300">
                          {reportMonthly.shopsNotUsing}
                        </span>{' '}
                        shops with no orders in the last 30 days.
                      </p>
                      {reportMonthly.shopsPaymentPending != null ? (
                        <p className="text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-300">
                            {reportMonthly.shopsPaymentPending}
                          </span>{' '}
                          shops — subscription pending/overdue (current).
                        </p>
                      ) : null}
                      {reportMonthly.partnersNotUsing != null ? (
                        <p className="text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-300">
                            {reportMonthly.partnersNotUsing}
                          </span>{' '}
                          partners idle (30 days).
                          {reportMonthly.partnerSampleCapped ? (
                            <span className="block pt-0.5 text-[9px] text-slate-500">
                              Partner idle counts may be approximate when many partners are active.
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {reportMonthly.deliveriesPending != null ? (
                        <p className="text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-300">
                            {reportMonthly.deliveriesPending}
                          </span>{' '}
                          deliveries pending (30-day pipeline).
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">
                      30-day analytics unavailable.
                    </p>
                  )}
                  {reportsPath === null &&
                  (reportToday?.kind === 'portal' || reportMonthly?.kind === 'portal') ? (
                    <button
                      type="button"
                      onClick={() => navigate('/portal/dashboard/accounts/overview')}
                      className="w-full shrink-0 rounded-xl border border-amber-200/80 bg-amber-50/80 py-2 text-[11px] font-semibold text-amber-900 shadow-sm hover:bg-amber-100/90 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
                    >
                      Open full accounts overview
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="teamify-surface mt-3 rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4 md:mt-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-slate-100">
              Team Members
            </h3>
            <span className="text-sm text-black dark:text-slate-300">
              {loading ? 'Loading...' : `${members.length} members`}
            </span>
          </div>

          <ul className="space-y-1">
            {members.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </ul>
        </section>
      </main>

      <ShopsMapModal
        isOpen={shopsMapOpen}
        onClose={() => setShopsMapOpen(false)}
        accessToken={accessToken}
        themeMode={themeMode}
        shopsBasePath={shopsPagePath}
      />
    </DashboardLayout>
  )
}

export default TeamDashboardPage
