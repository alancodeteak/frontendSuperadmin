import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { useTheme } from '@/context/useTheme'
import { getAdminAccountsOverview } from '@/apis/invoicesApi'
import {
  getReportsDeliveryPartners,
  getReportsFunnel,
  getReportsOverview,
} from '@/apis/reportsApi'
import {
  getSalesActivityForecast,
  getSalesActivityMonthly,
  getSalesActivityOverview,
  getSalesActivityTopShops,
} from '@/apis/salesActivityApi'
import { buildOperationsSnapshot } from '@/utils/operationsSnapshot'

const SAMPLE_OVERVIEW = {
  kpis: {
    today_signups: 6,
    week_signups: 34,
    month_signups: 128,
    today_growth_pct: 20,
    week_growth_pct: 12,
    month_growth_pct: 8,
  },
  trend: {
    window_days: 30,
    signups_daily: Array.from({ length: 30 }).map((_, idx) => {
      const d = new Date(Date.now() - (29 - idx) * 86400000)
      const ds = d.toISOString().slice(0, 10)
      const base = 3 + Math.round((idx / 29) * 4)
      return { date: ds, count: Math.max(0, base + (idx % 6 === 0 ? 4 : 0) - (idx % 9 === 0 ? 2 : 0)) }
    }),
  },
  activation: {
    activation_rate_pct: 62,
    median_time_to_first_order_mins: 620,
    time_to_first_order_buckets: { '0_1d': 14, '1_3d': 28, '3_7d': 22, gt_7d: 16, never: 48 },
  },
}

const SAMPLE_MONTHLY = [
  { month: '2025-10', shops_created: 91, orders_first_30d: 410, orders_same_month: 310, delivered_revenue_first_30d: 221000, subscription_amount_sum: 68000 },
  { month: '2025-11', shops_created: 98, orders_first_30d: 452, orders_same_month: 332, delivered_revenue_first_30d: 239500, subscription_amount_sum: 73500 },
  { month: '2025-12', shops_created: 116, orders_first_30d: 522, orders_same_month: 380, delivered_revenue_first_30d: 278800, subscription_amount_sum: 79200 },
  { month: '2026-01', shops_created: 121, orders_first_30d: 560, orders_same_month: 402, delivered_revenue_first_30d: 295100, subscription_amount_sum: 83000 },
  { month: '2026-02', shops_created: 130, orders_first_30d: 602, orders_same_month: 431, delivered_revenue_first_30d: 318600, subscription_amount_sum: 89200 },
  { month: '2026-03', shops_created: 128, orders_first_30d: 588, orders_same_month: 422, delivered_revenue_first_30d: 309900, subscription_amount_sum: 87100 },
]

const SAMPLE_TOP = [
  { shop_id: 'SHOP-001', shop_name: 'Neighborhood Store', user_id: 959521, months: { '2026-01': 121, '2026-02': 142, '2026-03': 160 } },
  { shop_id: 'SHOP-002', shop_name: 'Fresh Mart', user_id: 959522, months: { '2026-01': 98, '2026-02': 116, '2026-03': 130 } },
  { shop_id: 'SHOP-003', shop_name: 'Urban Basket', user_id: 959523, months: { '2026-01': 82, '2026-02': 101, '2026-03': 110 } },
]

const SAMPLE_FORECAST = { next_month: '2026-04', predicted_signups: 132, low: 112, high: 152, method: 'moving_avg_3' }

function pct(n) {
  const x = Number(n ?? 0)
  if (Number.isNaN(x)) return '0%'
  const sign = x > 0 ? '+' : ''
  return `${sign}${x.toFixed(1)}%`
}

function fmt(n) {
  const x = Number(n ?? 0)
  if (Number.isNaN(x)) return String(n ?? '0')
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(x)
}

function toCurrency(value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return String(value ?? '0')
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
}

function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30',
    amber: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30',
  }
  const cls = tones[tone] ?? tones.slate
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>{children}</span>
}

function ApplePie({ value, total, labelLeft = 'Activated', labelRight = 'Not yet', colorA = '#10b981', colorB = '#334155' }) {
  const v = Math.max(0, Number(value ?? 0))
  const t = Math.max(1, Number(total ?? 1))
  const p = Math.min(1, v / t)
  const deg = p * 360
  const bg = `conic-gradient(${colorA} 0deg ${deg}deg, ${colorB} ${deg}deg 360deg)`
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-24 w-24 rounded-full shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
        style={{ background: bg }}
        title={`${Math.round(p * 100)}%`}
      />
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{Math.round(p * 100)}% activation</div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: colorA }} />
            {labelLeft}
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: colorB }} />
            {labelRight}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function SalesActivityPage({
  brandTitle = 'Teamify',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createShopPath = '/dashboard/teamify/shops/create',
  reportsPath = '/dashboard/teamify/reports',
  invoicesPath = '/dashboard/teamify/accounts/invoices',
  overviewPath = '/dashboard/teamify/accounts/overview',
  activityDailyPath = '/dashboard/teamify/activity/daily',
  activitySalesPath = '/dashboard/teamify/activity/sales',
}) {
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const accessToken = useSelector((state) => state.auth.session.accessToken)

  const [days, setDays] = useState(30)
  const [months, setMonths] = useState(6)
  const [overview, setOverview] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [top, setTop] = useState([])
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)

  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportToday, setReportToday] = useState(null)
  const [reportMonthly, setReportMonthly] = useState(null)

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'activity.sales',
        paths: {
          dashboardPath,
          homeContactBookPath: '/dashboard/teamify/contact-book',
          shopsPath,
          createShopPath,
          deliveryPartnersPath: '/dashboard/teamify/delivery-partners',
          reportsPath,
          accountsInvoicesPath: invoicesPath,
          accountsOverviewPath: overviewPath,
          activityDailyPath,
          activitySalesPath,
        },
      }),
    [
      navigate,
      dashboardPath,
      shopsPath,
      createShopPath,
      reportsPath,
      invoicesPath,
      overviewPath,
      activityDailyPath,
      activitySalesPath,
    ]
  )

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setReportLoading(true)
      setReportError('')
      try {
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
          setReportError('Could not load reports. Check your connection and try again.')
        }
      } finally {
        if (!cancelled) setReportLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  useEffect(() => {
    let alive = true
    async function load() {
      if (!accessToken) return
      setLoading(true)
      try {
        const [ov, mon, tp, fc] = await Promise.all([
          getSalesActivityOverview({ days }, { accessToken }),
          getSalesActivityMonthly({ months }, { accessToken }),
          getSalesActivityTopShops({ limit: 20 }, { accessToken }),
          getSalesActivityForecast({ monthsBack: Math.max(3, months) }, { accessToken }),
        ])
        if (!alive) return
        setOverview(ov || SAMPLE_OVERVIEW)
        setMonthly(Array.isArray(mon) && mon.length ? mon : SAMPLE_MONTHLY)
        setTop(Array.isArray(tp) && tp.length ? tp : SAMPLE_TOP)
        setForecast(fc || SAMPLE_FORECAST)
      } catch (e) {
        if (!alive) return
        setOverview(SAMPLE_OVERVIEW)
        setMonthly(SAMPLE_MONTHLY)
        setTop(SAMPLE_TOP)
        setForecast(SAMPLE_FORECAST)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [accessToken, days, months])

  const buckets = overview?.activation?.time_to_first_order_buckets ?? {}
  const activated = (buckets['0_1d'] ?? 0) + (buckets['1_3d'] ?? 0) + (buckets['3_7d'] ?? 0) + (buckets.gt_7d ?? 0)
  const never = buckets.never ?? 0
  const total = activated + never

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle="Team Dashboard"
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
      <main className="relative flex-1 rounded-3xl bg-white p-4 dark:bg-slate-950/40">
        <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">Sales Activity</div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Chip tone="indigo">Cohorts: first‑30‑days orders (primary)</Chip>
              <Chip tone="slate">Same‑month orders (comparison)</Chip>
              <Chip tone="emerald">Forecast: {forecast?.next_month || '—'}</Chip>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Trend days</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>

            <label className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Months</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={12}>12</option>
            </select>

            <button
              className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/55"
              onClick={() => navigate(activityDailyPath)}
            >
              Open Daily Activity
            </button>
          </div>
        </div>

        <section className="teamify-surface rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4">
          <div className="mb-2 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Operations
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-black dark:text-slate-100">Today</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Last 24 hours first; 30-day context below. Subscription backlog is current.
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

                {reportToday ? (
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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Today&apos;s snapshot unavailable.</p>
                )}

                {reportMonthly ? (
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
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">30-day analytics unavailable.</p>
                )}
                {reportsPath ? (
                  <button
                    type="button"
                    onClick={() => navigate(reportsPath)}
                    className="w-full shrink-0 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-900/55"
                  >
                    Open full reports
                  </button>
                ) : null}
              </>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Today signups</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{fmt(overview?.kpis?.today_signups)}</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{pct(overview?.kpis?.today_growth_pct)} vs yesterday</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">This week signups</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{fmt(overview?.kpis?.week_signups)}</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{pct(overview?.kpis?.week_growth_pct)} vs last week</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">This month signups</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{fmt(overview?.kpis?.month_signups)}</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{pct(overview?.kpis?.month_growth_pct)} vs last month</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Shop signups trend</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{loading ? 'Loading…' : `${overview?.trend?.window_days ?? days} days`}</div>
            </div>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview?.trend?.signups_daily ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Signups" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Activation (time‑to‑first‑order)</div>
            <div className="mt-3">
              <ApplePie value={activated} total={total || 1} labelLeft="Activated" labelRight="Not yet" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                <div className="font-semibold text-slate-900 dark:text-white">Median TTF</div>
                <div className="mt-1">{fmt((overview?.activation?.median_time_to_first_order_mins ?? 0) / 60)} hrs</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                <div className="font-semibold text-slate-900 dark:text-white">Activated</div>
                <div className="mt-1">{fmt(activated)} / {fmt(total)}</div>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                <div className="font-semibold text-slate-900 dark:text-white">Buckets</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip tone="emerald">0–1d: {fmt(buckets['0_1d'])}</Chip>
                  <Chip tone="indigo">1–3d: {fmt(buckets['1_3d'])}</Chip>
                  <Chip tone="amber">3–7d: {fmt(buckets['3_7d'])}</Chip>
                  <Chip tone="slate">&gt;7d: {fmt(buckets.gt_7d)}</Chip>
                  <Chip tone="slate">Never: {fmt(buckets.never)}</Chip>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Cohort orders (shops created per month)</div>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders_first_30d" name="First‑30‑days orders" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="orders_same_month" name="Same‑month orders" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Subscriptions + Revenue (cohort month)</div>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => (String(name).includes('amount') || String(name).includes('revenue') ? toCurrency(v) : v)} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="subscription_amount_sum" name="Subscription sum" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="delivered_revenue_first_30d" name="Delivered revenue (first 30d)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Top shops (orders) — last 3 months</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Sorted by current month orders</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
              Forecast {forecast?.next_month || '—'}: <span className="font-semibold">{fmt(forecast?.predicted_signups)}</span> (range {fmt(forecast?.low)}–{fmt(forecast?.high)})
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">User ID</th>
                  <th className="px-3 py-2">M-2</th>
                  <th className="px-3 py-2">M-1</th>
                  <th className="px-3 py-2">M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {top.map((r) => {
                  const keys = Object.keys(r.months || {}).sort()
                  const k0 = keys[0]
                  const k1 = keys[1]
                  const k2 = keys[2]
                  return (
                    <tr key={r.shop_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 dark:text-white">{r.shop_name || r.shop_id}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{r.shop_id}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.user_id ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{fmt(r.months?.[k0])}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{fmt(r.months?.[k1])}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{fmt(r.months?.[k2])}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

