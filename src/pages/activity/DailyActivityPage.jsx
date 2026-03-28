import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { buildOperationsSnapshot } from '@/utils/operationsSnapshot'
import { getDailyActivityOverview, getDailyActivityTrends, listDailyActivityShops } from '@/apis/dailyActivityApi'

const SAMPLE_OVERVIEW = {
  date: '2026-03-27',
  kpis: {
    total_orders: 128,
    delivered_revenue: 46250,
    active_shops: 23,
  },
  status_counts: {
    Pending: 12,
    Assigned: 20,
    'Picked Up': 14,
    'Out for Delivery': 9,
    Delivered: 66,
    cancelled: 5,
    customer_not_available: 2,
  },
  sla: {
    avg_assign_mins: 6.4,
    avg_pickup_mins: 18.2,
    avg_deliver_mins: 39.7,
  },
}

const SAMPLE_TRENDS = [
  { date: '2026-03-21', orders: 102, delivered_revenue: 31800 },
  { date: '2026-03-22', orders: 96, delivered_revenue: 28900 },
  { date: '2026-03-23', orders: 121, delivered_revenue: 40200 },
  { date: '2026-03-24', orders: 110, delivered_revenue: 35100 },
  { date: '2026-03-25', orders: 125, delivered_revenue: 43800 },
  { date: '2026-03-26', orders: 119, delivered_revenue: 41750 },
  { date: '2026-03-27', orders: 128, delivered_revenue: 46250 },
]

function toCurrency(value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return String(value ?? '0')
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
}

function statusBadge(statusKey) {
  const key = String(statusKey || '').toLowerCase()
  if (key.includes('delivered')) return 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30'
  if (key.includes('cancel')) return 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/30'
  if (key.includes('pending')) return 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30'
  return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600'
}

function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30',
  }
  const cls = tones[tone] ?? tones.slate
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>{children}</span>
}

export default function DailyActivityPage({
  brandTitle = 'Teamify',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createShopPath = '/dashboard/teamify/shops/create',
  reportsPath = '/dashboard/teamify/reports',
  invoicesPath = '/dashboard/teamify/accounts/invoices',
  overviewPath = '/dashboard/teamify/accounts/overview',
}) {
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const accessToken = useSelector((state) => state.auth.session.accessToken)

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)
  const [trends, setTrends] = useState([])
  const [shops, setShops] = useState([])
  const [shopMeta, setShopMeta] = useState(null)
  const [usingSampleData, setUsingSampleData] = useState(false)
  const [shopLoadError, setShopLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('revenue_desc')
  const [page, setPage] = useState(1)
  const limit = 20

  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportToday, setReportToday] = useState(null)
  const [reportMonthly, setReportMonthly] = useState(null)

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
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setLoading(true)
      setError('')
      try {
        const [ovRes, trRes, shopRes] = await Promise.allSettled([
          getDailyActivityOverview({ targetDate }, { accessToken }),
          getDailyActivityTrends({ days: 7 }, { accessToken }),
          listDailyActivityShops({ targetDate, page, limit, search, sort }, { accessToken }),
        ])
        if (cancelled) return

        if (ovRes.status === 'fulfilled') {
          setOverview(ovRes.value)
        } else {
          setOverview(SAMPLE_OVERVIEW)
        }

        if (trRes.status === 'fulfilled') {
          setTrends(Array.isArray(trRes.value) ? trRes.value : [])
        } else {
          setTrends(SAMPLE_TRENDS)
        }

        if (shopRes.status === 'fulfilled') {
          const payload = shopRes.value
          setShops(Array.isArray(payload?.items) ? payload.items : [])
          setShopMeta(payload?.meta ?? null)
          setShopLoadError('')
        } else {
          setShops([])
          setShopMeta({ page: 1, limit, total: 0, total_pages: 1 })
          setShopLoadError(
            shopRes.reason?.message ?? 'Could not load the shop list. Check your connection.',
          )
        }

        setUsingSampleData(ovRes.status === 'rejected' || trRes.status === 'rejected')
        setError('')
      } catch (e) {
        if (!cancelled) {
          setOverview(SAMPLE_OVERVIEW)
          setTrends(SAMPLE_TRENDS)
          setShops([])
          setShopMeta({ page: 1, limit, total: 0, total_pages: 1 })
          setShopLoadError(
            e?.message ?? 'Could not load daily activity.',
          )
          setUsingSampleData(true)
          setError('')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [accessToken, page, search, sort, targetDate])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'activity.daily',
        paths: {
          dashboardPath,
          homeContactBookPath: '/dashboard/teamify/contact-book',
          shopsPath,
          createShopPath,
          deliveryPartnersPath: '/dashboard/teamify/delivery-partners',
          reportsPath,
          accountsInvoicesPath: invoicesPath,
          accountsOverviewPath: overviewPath,
          activityDailyPath: '/dashboard/teamify/activity/daily',
        },
      }),
    [createShopPath, dashboardPath, invoicesPath, navigate, overviewPath, reportsPath, shopsPath],
  )

  const kpis = overview?.kpis ?? {}
  const statusCounts = overview?.status_counts ?? {}
  const sla = overview?.sla ?? {}

  const shopTotal = Number(shopMeta?.total ?? 0)
  const shopLimit = Number(shopMeta?.limit ?? limit)
  const totalPages =
    shopMeta?.total_pages != null
      ? Math.max(1, Number(shopMeta.total_pages))
      : Math.max(1, Math.ceil(shopTotal / (shopLimit || 1)) || 1)

  const trendRows = useMemo(
    () =>
      (trends ?? []).map((r) => ({
        date: String(r.date).slice(5),
        orders: Number(r.orders ?? 0),
        revenue: Number(r.delivered_revenue ?? 0),
      })),
    [trends],
  )

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
        <header className="teamify-surface mb-4 rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                Activity
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Daily Activity</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Orders, delivered revenue, and SLA for the day. Every supermarket is listed below; order counts
                are zero when there was no activity on the selected date.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="emerald">Revenue: Delivered-only</Chip>
                <Chip tone="indigo">SLA: mins from created_at → assigned/picked/delivered</Chip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => {
                  setPage(1)
                  setTargetDate(e.target.value)
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </header>

        {loading ? <p className="mb-3 text-sm text-slate-500">Loading daily activity…</p> : null}
        {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}
        {usingSampleData ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Showing sample values for charts while live overview/trends data is unavailable. The shop list
            always comes from the database when that request succeeds.
          </p>
        ) : null}
        {shopLoadError ? (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
            {shopLoadError}
          </p>
        ) : null}

        <section className="teamify-surface mb-4 rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4">
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

        <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Orders</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.total_orders ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Delivered revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {toCurrency(kpis.delivered_revenue ?? 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Active shops</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.active_shops ?? 0}</p>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 xl:col-span-2">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Last 7 days (delivered revenue)
            </h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendRows}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Delivered revenue" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Status snapshot
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([k, v]) => (
                <span key={k} className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusBadge(k)}`}>
                  {k}: {v}
                </span>
              ))}
              {!Object.keys(statusCounts).length ? <p className="text-sm text-slate-500">No orders</p> : null}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">SLA (avg mins)</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Assign: {Number(sla.avg_assign_mins ?? 0).toFixed(1)}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">Pickup: {Number(sla.avg_pickup_mins ?? 0).toFixed(1)}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">Deliver: {Number(sla.avg_deliver_mins ?? 0).toFixed(1)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                All shops
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Order counts and revenue for the selected date only (20 per page). Revenue is the sum of order
                amounts for that day.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
                placeholder="Search shop name"
                className="w-full max-w-[340px] rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <select
                value={sort}
                onChange={(e) => {
                  setPage(1)
                  setSort(e.target.value)
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="revenue_desc">Revenue (desc)</option>
                <option value="orders_desc">Orders (desc)</option>
                <option value="name_asc">Name (A–Z)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left">Shop name</th>
                  <th className="px-3 py-2 text-left">User ID</th>
                  <th className="px-3 py-2 text-left">Total orders</th>
                  <th className="px-3 py-2 text-left">Total revenue</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr
                    key={`${s.user_id}-${s.shop_name}`}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{s.shop_name}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{s.user_id}</td>
                    <td className="px-3 py-2">
                      <span className="tabular-nums">{s.total_orders}</span>
                      {s.total_orders === 0 ? (
                        <span className="ml-2 text-[10px] text-slate-400">no orders</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{toCurrency(s.total_revenue)}</td>
                  </tr>
                ))}
                {!loading && shops.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      {shopLoadError ? 'Shop list could not be loaded.' : 'No shops match your search'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span>
              Page {shopMeta?.page ?? page} of {shopMeta?.total_pages ?? totalPages} •{' '}
              {shopTotal} shop{shopTotal === 1 ? '' : 's'} • {shopLimit} per page
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-xs disabled:opacity-40 dark:border-slate-600"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-xs disabled:opacity-40 dark:border-slate-600"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}

