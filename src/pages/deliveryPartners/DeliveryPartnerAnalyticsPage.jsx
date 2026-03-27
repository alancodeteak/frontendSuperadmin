import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { getDeliveryPartnerActivity } from '@/apis/deliveryPartnersApi'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'

const RANGE_OPTIONS = [7, 15, 30, 60, 90]

const SAMPLE_ACTIVITY = {
  series: {
    orders: [
      { date: '2026-03-21', count: 5 },
      { date: '2026-03-22', count: 7 },
      { date: '2026-03-23', count: 6 },
      { date: '2026-03-24', count: 8 },
      { date: '2026-03-25', count: 9 },
      { date: '2026-03-26', count: 7 },
      { date: '2026-03-27', count: 10 },
    ],
    earnings: [
      { date: '2026-03-21', earning: 360 },
      { date: '2026-03-22', earning: 520 },
      { date: '2026-03-23', earning: 460 },
      { date: '2026-03-24', earning: 590 },
      { date: '2026-03-25', earning: 650 },
      { date: '2026-03-26', earning: 540 },
      { date: '2026-03-27', earning: 710 },
    ],
    statuses: [
      { date: '2026-03-21', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 0, delivered: 2, customer_not_available: 0, cancelled: 0 } },
      { date: '2026-03-22', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 3, customer_not_available: 0, cancelled: 0 } },
      { date: '2026-03-23', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 2, customer_not_available: 0, cancelled: 0 } },
      { date: '2026-03-24', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 3, customer_not_available: 0, cancelled: 1 } },
      { date: '2026-03-25', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 4, customer_not_available: 0, cancelled: 1 } },
      { date: '2026-03-26', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 3, customer_not_available: 0, cancelled: 0 } },
      { date: '2026-03-27', statuses: { pending: 1, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 5, customer_not_available: 0, cancelled: 1 } },
    ],
  },
  summary: {
    total_orders: 52,
    total_earnings: 3830,
    delivered_rate: 42.31,
    cancelled_rate: 5.77,
  },
  growth: {
    orders_pct_vs_prev_period: 12.4,
    earnings_pct_vs_prev_period: 17.8,
  },
}

export default function DeliveryPartnerAnalyticsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { deliveryPartnerId } = useParams()
  const { themeMode, toggleTheme } = useTheme()
  const isDark = themeMode === 'dark'
  const { session, logoutStatus } = useSelector((state) => state.auth)
  const accessToken = session?.accessToken ?? null
  const isLoggingOut = logoutStatus === 'loading'

  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState('orders')
  const [activity, setActivity] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!deliveryPartnerId || !accessToken) return
      setStatus('loading')
      setError('')
      try {
        const data = await getDeliveryPartnerActivity(
          { delivery_partner_id: deliveryPartnerId, days },
          { accessToken },
        )
        if (!cancelled) {
          setActivity(data)
          setStatus('succeeded')
        }
      } catch (e) {
        if (!cancelled) {
          setActivity(null)
          setStatus('failed')
          setError(e?.message ?? 'Failed to load analytics')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [accessToken, days, deliveryPartnerId])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'partners.deliveryPartners',
        paths: {
          dashboardPath: '/dashboard/teamify',
          shopsPath: '/dashboard/teamify/shops',
          createShopPath: '/dashboard/teamify/shops/create',
          deliveryPartnersPath: '/dashboard/teamify/delivery-partners',
          accountsInvoicesPath: '/dashboard/teamify/accounts/invoices',
          accountsOverviewPath: '/dashboard/teamify/accounts/overview',
        },
      }),
    [navigate],
  )

  const current = activity?.series?.orders?.length ? activity : SAMPLE_ACTIVITY
  const usingSample = current === SAMPLE_ACTIVITY
  const summary = current?.summary ?? {}
  const growth = current?.growth ?? {}
  const orders = current?.series?.orders ?? []
  const earnings = current?.series?.earnings ?? []
  const statusesByDay = current?.series?.statuses ?? []

  const chartRows = useMemo(
    () =>
      orders.map((row, idx) => ({
        date: row.date,
        orders: Number(row.count ?? 0),
        earnings: Number(earnings?.[idx]?.earning ?? 0),
      })),
    [earnings, orders],
  )
  const peak = chartRows.reduce(
    (acc, row) => Math.max(acc, metric === 'orders' ? row.orders : row.earnings),
    0,
  )

  const statusTotals = useMemo(() => {
    const totals = {
      pending: 0,
      assigned: 0,
      picked_up: 0,
      out_for_delivery: 0,
      delivered: 0,
      customer_not_available: 0,
      cancelled: 0,
    }
    for (const day of statusesByDay) {
      const s = day?.statuses ?? {}
      for (const key of Object.keys(totals)) totals[key] += Number(s[key] ?? 0)
    }
    return totals
  }, [statusesByDay])
  const totalStatus = Object.values(statusTotals).reduce((a, b) => a + b, 0)

  const pieBackground = useMemo(() => {
    const colors = {
      pending: '#6366f1',
      assigned: '#8b5cf6',
      picked_up: '#06b6d4',
      out_for_delivery: '#0ea5e9',
      delivered: '#10b981',
      customer_not_available: '#f59e0b',
      cancelled: '#ef4444',
    }
    let cursor = 0
    const parts = []
    for (const [key, value] of Object.entries(statusTotals)) {
      const pct = totalStatus > 0 ? (value / totalStatus) * 100 : 0
      const start = cursor
      const end = cursor + pct
      parts.push(`${colors[key]} ${start.toFixed(2)}% ${end.toFixed(2)}%`)
      cursor = end
    }
    return `conic-gradient(${parts.join(', ')})`
  }, [statusTotals, totalStatus])

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate('/', { replace: true })
  }

  return (
    <DashboardLayout>
      <AppSidebar
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="flex-1 bg-slate-950 p-5">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold text-white">Delivery Partner Analytics</h1>
                <p className="text-sm text-slate-400">Partner ID: {deliveryPartnerId}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/teamify/delivery-partners/${deliveryPartnerId}`)}
                className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Back To Detail
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    days === option ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {option}D
                </button>
              ))}
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100"
              >
                <option value="orders">Orders Bar</option>
                <option value="earnings">Earnings Bar</option>
              </select>
            </div>
            {usingSample ? (
              <p className="mt-2 text-xs font-semibold text-amber-300">Temporary sample data is shown.</p>
            ) : null}
            {status === 'loading' ? <p className="mt-2 text-sm text-slate-400">Loading analytics...</p> : null}
            {error ? <p className="mt-2 text-sm font-semibold text-red-300">{error}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs text-slate-400">Orders</p>
              <p className="mt-1 text-lg font-semibold text-white">{summary.total_orders ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs text-slate-400">Earnings</p>
              <p className="mt-1 text-lg font-semibold text-white">{summary.total_earnings ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs text-slate-400">Delivered Rate</p>
              <p className="mt-1 text-lg font-semibold text-white">{summary.delivered_rate ?? 0}%</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs text-slate-400">Growth</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {growth.orders_pct_vs_prev_period == null ? 'N/A' : `${growth.orders_pct_vs_prev_period}%`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 lg:col-span-2">
              <p className="mb-2 text-sm font-semibold text-white">
                {metric === 'orders' ? 'Orders Bar Chart' : 'Earnings Bar Chart'}
              </p>
              <div className="space-y-2">
                {chartRows.map((row) => {
                  const value = metric === 'orders' ? row.orders : row.earnings
                  const width = peak > 0 ? Math.max(6, Math.round((value / peak) * 100)) : 6
                  return (
                    <div key={row.date} className="grid grid-cols-[90px_1fr_70px] items-center gap-2">
                      <p className="text-xs text-slate-300">{row.date}</p>
                      <div className="h-3 rounded-full bg-slate-700">
                        <div
                          className={`h-3 rounded-full ${metric === 'orders' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <p className="text-right text-xs font-semibold text-white">{value}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="mb-2 text-sm font-semibold text-white">Status Pie</p>
              <div className="mx-auto grid w-44 place-items-center">
                <div className="grid h-40 w-40 place-items-center rounded-full" style={{ background: pieBackground }}>
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {totalStatus}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {Object.entries(statusTotals).map(([key, value]) => (
                  <p key={key} className="text-xs text-slate-300">
                    {key}: <span className="font-semibold text-white">{value}</span>
                  </p>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
