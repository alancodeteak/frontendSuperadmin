import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { getShopActivity } from '@/apis/analyticsApi'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'

const RANGE_OPTIONS = [7, 15, 30, 60, 90]
const SAMPLE_ACTIVITY = {
  series: {
    orders: [
      { date: '2026-03-21', count: 9 },
      { date: '2026-03-22', count: 14 },
      { date: '2026-03-23', count: 11 },
      { date: '2026-03-24', count: 17 },
      { date: '2026-03-25', count: 19 },
      { date: '2026-03-26', count: 16 },
      { date: '2026-03-27', count: 22 },
    ],
    amount: [
      { date: '2026-03-21', total_amount: 1850 },
      { date: '2026-03-22', total_amount: 2760 },
      { date: '2026-03-23', total_amount: 2310 },
      { date: '2026-03-24', total_amount: 3140 },
      { date: '2026-03-25', total_amount: 3525 },
      { date: '2026-03-26', total_amount: 2990 },
      { date: '2026-03-27', total_amount: 4020 },
    ],
    statuses: [
      { date: '2026-03-21', statuses: { pending: 2, assigned: 1, picked_up: 1, out_for_delivery: 1, delivered: 3, customer_not_available: 0, cancelled: 1 } },
      { date: '2026-03-22', statuses: { pending: 3, assigned: 2, picked_up: 1, out_for_delivery: 1, delivered: 5, customer_not_available: 0, cancelled: 2 } },
      { date: '2026-03-23', statuses: { pending: 2, assigned: 2, picked_up: 1, out_for_delivery: 1, delivered: 4, customer_not_available: 1, cancelled: 0 } },
      { date: '2026-03-24', statuses: { pending: 3, assigned: 2, picked_up: 2, out_for_delivery: 2, delivered: 7, customer_not_available: 0, cancelled: 1 } },
      { date: '2026-03-25', statuses: { pending: 2, assigned: 3, picked_up: 2, out_for_delivery: 2, delivered: 8, customer_not_available: 1, cancelled: 1 } },
      { date: '2026-03-26', statuses: { pending: 2, assigned: 2, picked_up: 2, out_for_delivery: 2, delivered: 7, customer_not_available: 0, cancelled: 1 } },
      { date: '2026-03-27', statuses: { pending: 3, assigned: 3, picked_up: 2, out_for_delivery: 2, delivered: 10, customer_not_available: 1, cancelled: 1 } },
    ],
  },
  summary: { total_orders: 108, total_amount: 20595, avg_order_value: 190.69, delivered_rate: 40.74 },
}

function ShopAnalyticsPage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createPath = '/dashboard/teamify/shops/create',
  detailBasePath = '/dashboard/teamify/shops',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { userId } = useParams()
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
    const load = async () => {
      if (!userId || !accessToken) return
      setStatus('loading')
      setError('')
      try {
        const data = await getShopActivity({ user_id: userId, days }, { accessToken })
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
    load()
    return () => {
      cancelled = true
    }
  }, [accessToken, days, userId])

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
        },
      }),
    [createPath, dashboardPath, navigate, shopsPath],
  )

  const current = activity?.series?.orders?.length ? activity : SAMPLE_ACTIVITY
  const usingSample = current === SAMPLE_ACTIVITY
  const orders = current?.series?.orders ?? []
  const amounts = current?.series?.amount ?? []
  const statusesByDay = current?.series?.statuses ?? []
  const summary = current?.summary ?? {}

  const chartRows = useMemo(
    () =>
      orders.map((row, idx) => ({
        date: row.date,
        count: Number(row.count ?? 0),
        amount: Number(amounts?.[idx]?.total_amount ?? 0),
      })),
    [amounts, orders],
  )
  const peak = chartRows.reduce((acc, r) => Math.max(acc, metric === 'orders' ? r.count : r.amount), 0)

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
    for (const row of statusesByDay) {
      const s = row?.statuses ?? {}
      for (const key of Object.keys(totals)) totals[key] += Number(s[key] ?? 0)
    }
    return totals
  }, [statusesByDay])
  const totalStatusCount = Object.values(statusTotals).reduce((a, b) => a + b, 0)

  const pieStops = useMemo(() => {
    const palette = {
      pending: '#6366f1',
      assigned: '#8b5cf6',
      picked_up: '#06b6d4',
      out_for_delivery: '#0ea5e9',
      delivered: '#10b981',
      customer_not_available: '#f59e0b',
      cancelled: '#ef4444',
    }
    let cursor = 0
    const segments = []
    for (const [key, value] of Object.entries(statusTotals)) {
      const portion = totalStatusCount > 0 ? (value / totalStatusCount) * 100 : 0
      const start = cursor
      const end = cursor + portion
      segments.push(`${palette[key]} ${start.toFixed(2)}% ${end.toFixed(2)}%`)
      cursor = end
    }
    return `conic-gradient(${segments.join(', ')})`
  }, [statusTotals, totalStatusCount])

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
        subTitle={sidebarSubTitle}
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="flex-1 bg-slate-50 p-4 dark:bg-slate-950">
        <div className="mx-auto max-w-[1400px] space-y-4">
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className={`text-xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Shop Analytics</h1>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>User ID: {userId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`${detailBasePath}/${userId}`)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Back To Detail
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${days === option ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                >
                  {option}D
                </button>
              ))}
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <option value="orders">Orders Bar</option>
                <option value="amount">Amount Bar</option>
              </select>
            </div>
            {usingSample ? (
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Temporary sample data is shown.</p>
            ) : null}
            {status === 'loading' ? <p className="mt-2 text-sm text-slate-500">Loading analytics...</p> : null}
            {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs text-slate-400">Orders</p>
              <p className={`mt-1 text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{summary.total_orders ?? 0}</p>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs text-slate-400">Amount</p>
              <p className={`mt-1 text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{summary.total_amount ?? 0}</p>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs text-slate-400">Average Ticket</p>
              <p className={`mt-1 text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{summary.avg_order_value ?? 0}</p>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs text-slate-400">Delivered Rate</p>
              <p className={`mt-1 text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{summary.delivered_rate ?? 0}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className={`rounded-2xl border p-4 lg:col-span-2 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {metric === 'orders' ? 'Orders Bar Chart' : 'Amount Bar Chart'}
              </p>
              <div className="space-y-2">
                {chartRows.map((row) => {
                  const value = metric === 'orders' ? row.count : row.amount
                  const width = peak > 0 ? Math.max(6, Math.round((value / peak) * 100)) : 6
                  return (
                    <div key={row.date} className="grid grid-cols-[100px_1fr_80px] items-center gap-2">
                      <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{row.date}</p>
                      <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-3 rounded-full ${metric === 'orders' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <p className={`text-right text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Order Status Pie</p>
              <div className="mx-auto grid w-44 place-items-center">
                <div
                  className="grid h-40 w-40 place-items-center rounded-full"
                  style={{ background: pieStops }}
                >
                  <div className={`grid h-20 w-20 place-items-center rounded-full text-xs font-semibold ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
                    {totalStatusCount}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {Object.entries(statusTotals).map(([key, value]) => (
                  <p key={key} className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {key}: <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</span>
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

export default ShopAnalyticsPage
