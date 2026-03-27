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

const SAMPLE_SHOPS = [
  {
    shop_id: 'SHOP-001',
    shop_name: 'Neighborhood Store',
    user_id: 959521,
    total_orders: 19,
    delivered_orders: 15,
    cancelled_orders: 1,
    delivered_revenue: 8650,
    sla: { avg_deliver_mins: 33.2 },
  },
  {
    shop_id: 'SHOP-002',
    shop_name: 'Fresh Mart',
    user_id: 959522,
    total_orders: 16,
    delivered_orders: 12,
    cancelled_orders: 2,
    delivered_revenue: 7240,
    sla: { avg_deliver_mins: 36.1 },
  },
  {
    shop_id: 'SHOP-003',
    shop_name: 'Urban Basket',
    user_id: 959523,
    total_orders: 14,
    delivered_orders: 11,
    cancelled_orders: 1,
    delivered_revenue: 6620,
    sla: { avg_deliver_mins: 41.8 },
  },
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
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('revenue_desc')
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setLoading(true)
      setError('')
      try {
        const [ov, tr, shopRes] = await Promise.all([
          getDailyActivityOverview({ targetDate }, { accessToken }),
          getDailyActivityTrends({ days: 7 }, { accessToken }),
          listDailyActivityShops({ targetDate, page, limit, search, sort }, { accessToken }),
        ])
        if (cancelled) return
        setOverview(ov)
        setTrends(Array.isArray(tr) ? tr : [])
        setShops(shopRes?.items ?? [])
        setShopMeta(shopRes?.meta ?? null)
        setUsingSampleData(false)
      } catch (e) {
        if (!cancelled) {
          setOverview(SAMPLE_OVERVIEW)
          setTrends(SAMPLE_TRENDS)
          setShops(SAMPLE_SHOPS)
          setShopMeta({ page: 1, total: SAMPLE_SHOPS.length })
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
                Orders, delivered revenue, shop performance, and SLA snapshots.
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
            Showing sample values while live API data is unavailable.
          </p>
        ) : null}

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
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Shops today
            </h2>
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
                <option value="revenue_desc">Revenue desc</option>
                <option value="orders_desc">Orders desc</option>
                <option value="sla_deliver_desc">Worst SLA (deliver)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left">Shop</th>
                  <th className="px-3 py-2 text-left">Orders</th>
                  <th className="px-3 py-2 text-left">Delivered</th>
                  <th className="px-3 py-2 text-left">Cancelled</th>
                  <th className="px-3 py-2 text-left">Delivered revenue</th>
                  <th className="px-3 py-2 text-left">SLA deliver (mins)</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.shop_id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{s.shop_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">UID: {s.user_id} • {s.shop_id}</div>
                    </td>
                    <td className="px-3 py-2">{s.total_orders}</td>
                    <td className="px-3 py-2">{s.delivered_orders}</td>
                    <td className="px-3 py-2">{s.cancelled_orders}</td>
                    <td className="px-3 py-2">{toCurrency(s.delivered_revenue)}</td>
                    <td className="px-3 py-2">{Number(s?.sla?.avg_deliver_mins ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
                {!loading && shops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No shops found for this day
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>
              Page {shopMeta?.page ?? page} • Total {shopMeta?.total ?? 0}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border px-3 py-2 text-xs dark:border-slate-600"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <button
                className="rounded-xl border px-3 py-2 text-xs dark:border-slate-600"
                onClick={() => setPage((p) => p + 1)}
                disabled={shopMeta?.total ? page * limit >= shopMeta.total : shops.length < limit}
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

