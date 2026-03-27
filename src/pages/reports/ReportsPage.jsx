import { Fragment, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'
import {
  getReportsDeliveryPartners,
  getReportsFinance,
  getReportsFunnel,
  getReportsOverview,
  getReportsShops,
} from '@/apis/reportsApi'

const RANGE_OPTIONS = [7, 30, 60, 90]
const TABS = ['overview', 'shops', 'partners', 'operations', 'finance']
const TABS_WITH_TOTALS = ['totals', ...TABS]

const SAMPLE_OVERVIEW = {
  kpis: {
    total_orders: 326,
    total_deliveries: 255,
    total_amount: 64250,
    delivered_rate: 78.22,
    cancelled_rate: 7.36,
    active_shops: 18,
    active_partners: 42,
  },
  growth: {
    orders_pct_vs_prev_period: 12.4,
    amount_pct_vs_prev_period: 15.8,
  },
  series: [
    { date: '2026-03-21', orders: 38, amount: 7350 },
    { date: '2026-03-22', orders: 42, amount: 8120 },
    { date: '2026-03-23', orders: 45, amount: 8760 },
    { date: '2026-03-24', orders: 50, amount: 9420 },
    { date: '2026-03-25', orders: 47, amount: 9010 },
    { date: '2026-03-26', orders: 53, amount: 10120 },
    { date: '2026-03-27', orders: 51, amount: 9470 },
  ],
  order_time_heatmap: [
    { day_of_week: 0, hour_of_day: 9, orders: 8, amount: 1220 },
    { day_of_week: 0, hour_of_day: 13, orders: 14, amount: 2410 },
    { day_of_week: 0, hour_of_day: 19, orders: 18, amount: 3020 },
    { day_of_week: 1, hour_of_day: 9, orders: 10, amount: 1560 },
    { day_of_week: 1, hour_of_day: 13, orders: 17, amount: 2890 },
    { day_of_week: 1, hour_of_day: 20, orders: 21, amount: 3380 },
    { day_of_week: 2, hour_of_day: 10, orders: 11, amount: 1740 },
    { day_of_week: 2, hour_of_day: 14, orders: 16, amount: 2680 },
    { day_of_week: 2, hour_of_day: 20, orders: 19, amount: 3250 },
    { day_of_week: 3, hour_of_day: 9, orders: 12, amount: 1860 },
    { day_of_week: 3, hour_of_day: 13, orders: 19, amount: 3050 },
    { day_of_week: 3, hour_of_day: 21, orders: 23, amount: 3640 },
    { day_of_week: 4, hour_of_day: 10, orders: 13, amount: 1980 },
    { day_of_week: 4, hour_of_day: 14, orders: 20, amount: 3210 },
    { day_of_week: 4, hour_of_day: 21, orders: 24, amount: 3810 },
    { day_of_week: 5, hour_of_day: 11, orders: 15, amount: 2260 },
    { day_of_week: 5, hour_of_day: 15, orders: 22, amount: 3480 },
    { day_of_week: 5, hour_of_day: 20, orders: 25, amount: 3990 },
    { day_of_week: 6, hour_of_day: 10, orders: 14, amount: 2100 },
    { day_of_week: 6, hour_of_day: 14, orders: 21, amount: 3320 },
    { day_of_week: 6, hour_of_day: 19, orders: 26, amount: 4120 },
  ],
  revenue: {
    total_revenue_all_shops: 64250,
    per_shop: [
      { shop_id: 'SHOP101', shop_name: 'Green Basket', orders: 64, revenue: 12540 },
      { shop_id: 'SHOP102', shop_name: 'City Mart', orders: 58, revenue: 11320 },
      { shop_id: 'SHOP103', shop_name: 'Fresh Point', orders: 51, revenue: 9800 },
      { shop_id: 'SHOP104', shop_name: 'Urban Store', orders: 47, revenue: 9050 },
    ],
  },
}

const SAMPLE_SHOPS = [
  { shop_id: 'SHOP101', shop_name: 'Green Basket', orders: 64, amount: 12540, delivered_rate: 82.1, cancelled_rate: 6.2 },
  { shop_id: 'SHOP102', shop_name: 'City Mart', orders: 58, amount: 11320, delivered_rate: 79.2, cancelled_rate: 7.1 },
  { shop_id: 'SHOP103', shop_name: 'Fresh Point', orders: 51, amount: 9800, delivered_rate: 76.4, cancelled_rate: 8.4 },
  { shop_id: 'SHOP104', shop_name: 'Urban Store', orders: 47, amount: 9050, delivered_rate: 74.6, cancelled_rate: 9.1 },
]

const SAMPLE_PARTNERS = [
  { delivery_partner_id: 'DP101', name: 'Arun K', orders: 44, earnings: 3120, delivered_rate: 85.4, cancelled_rate: 5.0, online_status: 'online' },
  { delivery_partner_id: 'DP102', name: 'Rahul S', orders: 39, earnings: 2810, delivered_rate: 81.2, cancelled_rate: 6.8, online_status: 'offline' },
  { delivery_partner_id: 'DP103', name: 'Nisha P', orders: 36, earnings: 2670, delivered_rate: 79.1, cancelled_rate: 7.6, online_status: 'online' },
  { delivery_partner_id: 'DP104', name: 'Deepak R', orders: 34, earnings: 2450, delivered_rate: 77.8, cancelled_rate: 8.1, online_status: 'online' },
]

const SAMPLE_FUNNEL = {
  pending: 52,
  assigned: 49,
  picked_up: 45,
  out_for_delivery: 41,
  delivered: 38,
  cancelled: 4,
}

const SAMPLE_FINANCE = {
  trend: [
    { date: '2026-03-21', amount: 7350, delivery_charge: 760 },
    { date: '2026-03-22', amount: 8120, delivery_charge: 840 },
    { date: '2026-03-23', amount: 8760, delivery_charge: 910 },
    { date: '2026-03-24', amount: 9420, delivery_charge: 980 },
    { date: '2026-03-25', amount: 9010, delivery_charge: 920 },
    { date: '2026-03-26', amount: 10120, delivery_charge: 1050 },
    { date: '2026-03-27', amount: 9470, delivery_charge: 990 },
  ],
  payment_split: [
    { payment_mode: 'cash', amount: 18240 },
    { payment_mode: 'upi', amount: 21180 },
    { payment_mode: 'online', amount: 14950 },
    { payment_mode: 'credit', amount: 9880 },
  ],
}

function downloadCsv(filename, rows) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h] ?? ''
          const escaped = String(value).replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const isDark = themeMode === 'dark'
  const { session, logoutStatus } = useSelector((state) => state.auth)
  const accessToken = session?.accessToken ?? null
  const isLoggingOut = logoutStatus === 'loading'

  const [days, setDays] = useState(30)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)
  const [shops, setShops] = useState([])
  const [partners, setPartners] = useState([])
  const [funnel, setFunnel] = useState(null)
  const [finance, setFinance] = useState(null)
  const [usingSampleData, setUsingSampleData] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!accessToken) return
      setLoading(true)
      setError('')
      try {
        const [ov, sh, dp, fn, fi] = await Promise.all([
          getReportsOverview({ days }, { accessToken }),
          getReportsShops({ days, limit: 8 }, { accessToken }),
          getReportsDeliveryPartners({ days, limit: 8 }, { accessToken }),
          getReportsFunnel({ days }, { accessToken }),
          getReportsFinance({ days }, { accessToken }),
        ])
        if (!cancelled) {
          setOverview(ov)
          setShops(Array.isArray(sh) ? sh : [])
          setPartners(Array.isArray(dp) ? dp : [])
          setFunnel(fn)
          setFinance(fi)
          setUsingSampleData(false)
        }
      } catch (e) {
        if (!cancelled) {
          setOverview(SAMPLE_OVERVIEW)
          setShops(SAMPLE_SHOPS)
          setPartners(SAMPLE_PARTNERS)
          setFunnel(SAMPLE_FUNNEL)
          setFinance(SAMPLE_FINANCE)
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
  }, [accessToken, days])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'reports.main',
        paths: {
          dashboardPath: '/dashboard/teamify',
          shopsPath: '/dashboard/teamify/shops',
          createShopPath: '/dashboard/teamify/shops/create',
          deliveryPartnersPath: '/dashboard/teamify/delivery-partners',
          reportsPath: '/dashboard/teamify/reports',
        },
      }),
    [navigate],
  )

  const paymentSplit = finance?.payment_split ?? []
  const totalSplit = paymentSplit.reduce((acc, r) => acc + Number(r?.amount ?? 0), 0)
  const heatmapRows = overview?.order_time_heatmap ?? []
  const revenue = overview?.revenue ?? { total_revenue_all_shops: 0, per_shop: [] }
  const heatmapDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmapHours = Array.from({ length: 24 }, (_, i) => i)
  const heatmapMap = useMemo(() => {
    const m = new Map()
    for (const row of heatmapRows) {
      const key = `${Number(row.day_of_week)}-${Number(row.hour_of_day)}`
      m.set(key, Number(row.orders ?? 0))
    }
    return m
  }, [heatmapRows])
  const heatmapPeak = useMemo(
    () =>
      heatmapRows.reduce(
        (acc, row) => (Number(row.orders ?? 0) > Number(acc.orders ?? 0) ? row : acc),
        { day_of_week: 0, hour_of_day: 0, orders: 0 },
      ),
    [heatmapRows],
  )
  const maxHeatOrders = Math.max(...heatmapRows.map((r) => Number(r.orders ?? 0)), 1)
  const trendData = (overview?.series ?? []).map((r) => ({
    date: r.date,
    orders: Number(r.orders ?? 0),
    amount: Number(r.amount ?? 0),
  }))
  const shopBarData = shops.map((s) => ({ name: s.shop_name ?? s.shop_id, orders: Number(s.orders ?? 0), amount: Number(s.amount ?? 0) }))
  const partnerBarData = partners.map((p) => ({ name: p.name ?? p.delivery_partner_id, orders: Number(p.orders ?? 0), earnings: Number(p.earnings ?? 0) }))
  const funnelData = [
    { stage: 'Pending', value: Number(funnel?.pending ?? 0) },
    { stage: 'Assigned', value: Number(funnel?.assigned ?? 0) },
    { stage: 'PickedUp', value: Number(funnel?.picked_up ?? 0) },
    { stage: 'OutForDelivery', value: Number(funnel?.out_for_delivery ?? 0) },
    { stage: 'Delivered', value: Number(funnel?.delivered ?? 0) },
    { stage: 'Cancelled', value: Number(funnel?.cancelled ?? 0) },
  ]
  const paymentPieData = paymentSplit.map((p) => ({ name: p.payment_mode ?? 'unknown', value: Number(p.amount ?? 0) }))
  const pieColors = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#22d3ee']

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate('/', { replace: true })
  }

  const card = `rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`
  const strong = isDark ? 'text-slate-100' : 'text-slate-900'
  const subtle = isDark ? 'text-slate-300' : 'text-slate-600'

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle="Teamify"
        subTitle="Team Dashboard"
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <main className="flex-1 bg-slate-50 p-4 dark:bg-slate-950">
        <div className="mx-auto max-w-[1450px] space-y-4">
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className={`text-2xl font-semibold ${strong}`}>Reports Dashboard</h1>
                <p className={`text-sm ${subtle}`}>Overview, growth, trends and performance metrics</p>
              </div>
              <div className="flex gap-2">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDays(opt)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      days === opt ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {opt}D
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TABS_WITH_TOTALS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                    activeTab === tab ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {loading ? <p className={`mt-2 text-sm ${subtle}`}>Loading reports...</p> : null}
            {error ? <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p> : null}
            {usingSampleData ? (
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Temporary sample report data is shown.
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className={card}><p className="text-xs text-slate-400">Orders</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.total_orders ?? 0}</p></div>
            <div className={card}><p className="text-xs text-slate-400">Deliveries</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.total_deliveries ?? 0}</p></div>
            <div className={card}><p className="text-xs text-slate-400">Amount</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.total_amount ?? 0}</p></div>
            <div className={card}><p className="text-xs text-slate-400">Delivered %</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.delivered_rate ?? 0}%</p></div>
            <div className={card}><p className="text-xs text-slate-400">Cancelled %</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.cancelled_rate ?? 0}%</p></div>
            <div className={card}><p className="text-xs text-slate-400">Active Shops</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.active_shops ?? 0}</p></div>
            <div className={card}><p className="text-xs text-slate-400">Active Partners</p><p className={`mt-1 text-lg font-semibold ${strong}`}>{overview?.kpis?.active_partners ?? 0}</p></div>
          </section>

          {activeTab === 'totals' ? (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className={`${card} xl:col-span-2`}>
                <p className={`mb-3 text-sm font-semibold ${strong}`}>Total Numbers Overview</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className={`rounded-xl border p-4 text-center ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Total Deliveries</p>
                    <p className={`mt-2 text-2xl font-bold ${strong}`}>{overview?.kpis?.total_deliveries ?? 0}</p>
                  </div>
                  <div className={`rounded-xl border p-4 text-center ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Total Amount</p>
                    <p className={`mt-2 text-2xl font-bold ${strong}`}>{overview?.kpis?.total_amount ?? 0}</p>
                  </div>
                  <div className={`rounded-xl border p-4 text-center ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Total Shops</p>
                    <p className={`mt-2 text-2xl font-bold ${strong}`}>{overview?.kpis?.active_shops ?? 0}</p>
                  </div>
                  <div className={`rounded-xl border p-4 text-center ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Total Partners</p>
                    <p className={`mt-2 text-2xl font-bold ${strong}`}>{overview?.kpis?.active_partners ?? 0}</p>
                  </div>
                </div>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { metric: 'Deliveries', value: Number(overview?.kpis?.total_deliveries ?? 0) },
                        { metric: 'Amount', value: Number(overview?.kpis?.total_amount ?? 0) },
                        { metric: 'Shops', value: Number(overview?.kpis?.active_shops ?? 0) },
                        { metric: 'Partners', value: Number(overview?.kpis?.active_partners ?? 0) },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="metric" tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                      <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" barSize={40} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={card}>
                <p className={`mb-3 text-sm font-semibold ${strong}`}>Totals Share</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Deliveries', value: Number(overview?.kpis?.total_deliveries ?? 0) },
                          { name: 'Shops', value: Number(overview?.kpis?.active_shops ?? 0) },
                          { name: 'Partners', value: Number(overview?.kpis?.active_partners ?? 0) },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={95}
                        label
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#22c55e" />
                        <Cell fill="#0ea5e9" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-xs ${subtle}`}>
                  Total revenue (all shops): <span className={strong}>{Number(overview?.revenue?.total_revenue_all_shops ?? 0).toFixed(2)}</span>
                </p>
              </div>
            </section>
          ) : null}

          {activeTab === 'overview' ? (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={card}>
                <p className={`mb-2 text-sm font-semibold ${strong}`}>Orders & Amount Trend</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="date" tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                      <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={card}>
                <p className={`mb-2 text-sm font-semibold ${strong}`}>Growth Snapshot</p>
                <p className={`text-sm ${subtle}`}>Orders growth: <span className={strong}>{overview?.growth?.orders_pct_vs_prev_period ?? 'N/A'}%</span></p>
                <p className={`text-sm ${subtle}`}>Amount growth: <span className={strong}>{overview?.growth?.amount_pct_vs_prev_period ?? 'N/A'}%</span></p>
                <p className={`mt-3 text-xs ${subtle}`}>Active shops: {overview?.kpis?.active_shops ?? 0}</p>
                <p className={`text-xs ${subtle}`}>Active partners: {overview?.kpis?.active_partners ?? 0}</p>
                <p className={`mt-3 text-sm ${subtle}`}>
                  Peak order slot: <span className={strong}>{heatmapDays[Number(heatmapPeak.day_of_week) || 0]} {String(Number(heatmapPeak.hour_of_day) || 0).padStart(2, '0')}:00</span>
                  {' '}({Number(heatmapPeak.orders ?? 0)} orders)
                </p>
                <p className={`text-sm ${subtle}`}>
                  Total revenue (all shops): <span className={strong}>{Number(revenue.total_revenue_all_shops ?? 0).toFixed(2)}</span>
                </p>
              </div>
              <div className={`${card} lg:col-span-2`}>
                <p className={`mb-2 text-sm font-semibold ${strong}`}>Order Time Heatmap (Day x Hour)</p>
                <div className="overflow-x-auto">
                  <div className="inline-grid min-w-[900px] grid-cols-[80px_repeat(24,minmax(26px,1fr))] gap-1 text-[10px]">
                    <div />
                    {heatmapHours.map((h) => (
                      <div key={`h-${h}`} className={`text-center ${subtle}`}>
                        {String(h).padStart(2, '0')}
                      </div>
                    ))}
                    {heatmapDays.map((day, dIdx) => (
                      <Fragment key={`row-${day}`}>
                        <div key={`d-label-${day}`} className={`flex items-center ${subtle}`}>{day}</div>
                        {heatmapHours.map((h) => {
                          const count = Number(heatmapMap.get(`${dIdx}-${h}`) ?? 0)
                          const intensity = count > 0 ? Math.max(0.15, count / maxHeatOrders) : 0
                          return (
                            <div
                              key={`cell-${dIdx}-${h}`}
                              className="h-6 rounded"
                              title={`${day} ${String(h).padStart(2, '0')}:00 — ${count} orders`}
                              style={{
                                backgroundColor:
                                  count > 0
                                    ? `rgba(99,102,241,${intensity.toFixed(2)})`
                                    : isDark
                                      ? 'rgba(51,65,85,0.35)'
                                      : 'rgba(226,232,240,0.75)',
                              }}
                            />
                          )
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`${card} lg:col-span-2`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className={`text-sm font-semibold ${strong}`}>Revenue by Shop</p>
                  <button
                    type="button"
                    onClick={() => downloadCsv(`revenue-by-shop-${days}d.csv`, revenue.per_shop ?? [])}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {(revenue.per_shop ?? []).map((row) => (
                    <div key={row.shop_id} className="grid grid-cols-[1fr_100px_120px] items-center gap-2">
                      <p className={`truncate text-xs ${strong}`}>{row.shop_name ?? row.shop_id}</p>
                      <p className={`text-right text-xs ${subtle}`}>{row.orders} orders</p>
                      <p className={`text-right text-xs font-semibold ${strong}`}>{Number(row.revenue ?? 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'shops' ? (
            <section className={card}>
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-sm font-semibold ${strong}`}>Top Shops</p>
                <button
                  type="button"
                  onClick={() => downloadCsv(`shops-report-${days}d.csv`, shops)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Export CSV
                </button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shopBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                    <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#8b5cf6" barSize={12} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="amount" fill="#10b981" barSize={12} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          {activeTab === 'partners' ? (
            <section className={card}>
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-sm font-semibold ${strong}`}>Top Delivery Partners</p>
                <button
                  type="button"
                  onClick={() => downloadCsv(`partners-report-${days}d.csv`, partners)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Export CSV
                </button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={partnerBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                    <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#6366f1" barSize={12} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="earnings" fill="#22c55e" barSize={12} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          {activeTab === 'operations' ? (
            <section className={card}>
              <p className={`mb-3 text-sm font-semibold ${strong}`}>Order Funnel</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="stage" tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                    <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" barSize={18} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          {activeTab === 'finance' ? (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={card}>
                <p className={`mb-2 text-sm font-semibold ${strong}`}>Finance Trend</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={(finance?.trend ?? []).map((r) => ({ date: r.date, amount: Number(r.amount ?? 0), delivery_charge: Number(r.delivery_charge ?? 0) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="date" tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                      <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="delivery_charge" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={card}>
                <div className="mb-3 flex items-center justify-between">
                  <p className={`text-sm font-semibold ${strong}`}>Payment Split</p>
                  <button
                    type="button"
                    onClick={() => downloadCsv(`finance-split-${days}d.csv`, paymentSplit)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentPieData} dataKey="value" nameKey="name" outerRadius={110} label>
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-xs ${subtle}`}>Total split amount: {totalSplit.toFixed(2)}</p>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </DashboardLayout>
  )
}
