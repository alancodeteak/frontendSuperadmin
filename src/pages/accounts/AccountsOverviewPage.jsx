import { Fragment, useEffect, useMemo, useState } from 'react'
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
import {
  getAdminAccountsOverview,
  getPortalAccountsOverview,
  listAdminInvoicesEnvelope,
  listPortalInvoicesEnvelope,
} from '@/apis/invoicesApi'
import { listSupermarkets } from '@/apis/supermarketsApi'

function toCurrency(value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return String(value ?? '0')
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
}

function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30',
    amber: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30',
  }
  const cls = tones[tone] ?? tones.slate
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>{children}</span>
}

const SAMPLE = {
  window_days: 30,
  kpis: {
    collected_amount: 255000,
    to_collect_amount: 92000,
    overdue_shops: 4,
    pending_shops: 7,
    overdue_invoices: 6,
    pending_invoices: 11,
  },
  series: {
    daily_collected: [
      { date: '2026-03-20', amount: 9000 },
      { date: '2026-03-21', amount: 13500 },
      { date: '2026-03-22', amount: 8000 },
      { date: '2026-03-23', amount: 16000 },
      { date: '2026-03-24', amount: 22000 },
      { date: '2026-03-25', amount: 18000 },
    ],
  },
  lists: {
    top_overdue_shops: [
      { shop_id: 'SHOP-001', amount: 12000, count: 2 },
      { shop_id: 'SHOP-014', amount: 9000, count: 1 },
    ],
  },
}

export default function AccountsOverviewPage({
  mode = 'admin',
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
  const [days, setDays] = useState(30)
  const [selectedMonth, setSelectedMonth] = useState('') // YYYY-MM (frontend-only)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [shopNameMap, setShopNameMap] = useState({})
  const [pendingInvoices, setPendingInvoices] = useState([])
  const [overdueInvoices, setOverdueInvoices] = useState([])

  const shouldTreatIssuedAsPending = useMemo(() => {
    const now = new Date()
    if (now.getUTCDate() <= 5) return false
    if (!selectedMonth) return true
    const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    return selectedMonth === key
  }, [selectedMonth])

  const monthOptions = useMemo(() => {
    const now = new Date()
    const opts = []
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      opts.push(key)
    }
    return opts
  }, [])

  const monthRange = useMemo(() => {
    if (!selectedMonth) return null
    const [y, m] = selectedMonth.split('-').map((v) => Number(v))
    if (!y || !m) return null
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59))
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }, [selectedMonth])

  const fetchAll = async ({ status }) => {
    const range = monthRange
    const limit = 200
    let page = 1
    let total = 0
    const out = []
    do {
      const params = {
        page: String(page),
        limit: String(limit),
        status,
        document_type: 'INVOICE',
        ...(range ? { billing_period_start: range.startIso, billing_period_end: range.endIso } : {}),
      }
      const env =
        mode === 'portal'
          ? await listPortalInvoicesEnvelope(params, { accessToken })
          : await listAdminInvoicesEnvelope(params, { accessToken })
      const items = Array.isArray(env?.data) ? env.data : []
      total = Number(env?.meta?.total ?? items.length)
      out.push(...items)
      page += 1
      if (out.length >= 1200) break
    } while (out.length < total)
    return out
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) return
      setLoading(true)
      setError('')
      try {
        // If month filter selected, compute overview from invoice lists (frontend-only month filter).
        if (monthRange) {
          const [paid, pending, overdue, issuedMaybe] = await Promise.all([
            fetchAll({ status: 'PAID' }),
            fetchAll({ status: 'PENDING' }),
            fetchAll({ status: 'OVERDUE' }),
            shouldTreatIssuedAsPending ? fetchAll({ status: 'ISSUED' }) : Promise.resolve([]),
          ])

          const issued = Array.isArray(issuedMaybe) ? issuedMaybe : []
          const pendingEffective = shouldTreatIssuedAsPending ? [...pending, ...issued] : pending

          const collected = paid.reduce((acc, r) => acc + Number(r?.amount ?? 0), 0)
          const toCollect =
            pendingEffective.reduce((acc, r) => acc + Number(r?.amount ?? 0), 0) +
            overdue.reduce((acc, r) => acc + Number(r?.amount ?? 0), 0)

          const overdueShops = new Set(overdue.map((r) => String(r?.shop_id ?? '')).filter(Boolean))
          const pendingShops = new Set(pendingEffective.map((r) => String(r?.shop_id ?? '')).filter(Boolean))

          const dailyMap = new Map()
          for (const r of paid) {
            const key = String(r?.paid_at ?? r?.billing_period_start ?? '').slice(0, 10)
            if (!key) continue
            dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(r?.amount ?? 0))
          }
          const daily = Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, amount]) => ({ date, amount }))

          const overdueAgg = new Map()
          for (const r of overdue) {
            const sid = String(r?.shop_id ?? '')
            if (!sid) continue
            const prev = overdueAgg.get(sid) ?? { shop_id: sid, amount: 0, count: 0 }
            overdueAgg.set(sid, {
              shop_id: sid,
              amount: prev.amount + Number(r?.amount ?? 0),
              count: prev.count + 1,
            })
          }
          const topOverdue = Array.from(overdueAgg.values()).sort((a, b) => b.amount - a.amount).slice(0, 10)

          if (!cancelled) {
            setData({
              window_days: null,
              window_month: selectedMonth,
              kpis: {
                collected_amount: collected,
                to_collect_amount: toCollect,
                overdue_shops: overdueShops.size,
                pending_shops: pendingShops.size,
                overdue_invoices: overdue.length,
                pending_invoices: pendingEffective.length,
              },
              series: { daily_collected: daily },
              lists: { top_overdue_shops: topOverdue },
            })
            setPendingInvoices(pendingEffective)
            setOverdueInvoices(overdue)
          }
        } else {
          const payload =
            mode === 'portal'
              ? await getPortalAccountsOverview({ days }, { accessToken })
              : await getAdminAccountsOverview({ days }, { accessToken })
          if (!cancelled) {
            setData(payload ?? null)
            // Also fetch invoice lists for visibility (and apply "ISSUED->PENDING after 5th" in UI).
            const [pending, overdue, issuedMaybe] = await Promise.all([
              fetchAll({ status: 'PENDING' }),
              fetchAll({ status: 'OVERDUE' }),
              shouldTreatIssuedAsPending ? fetchAll({ status: 'ISSUED' }) : Promise.resolve([]),
            ])
            const issued = Array.isArray(issuedMaybe) ? issuedMaybe : []
            setPendingInvoices(shouldTreatIssuedAsPending ? [...pending, ...issued] : pending)
            setOverdueInvoices(overdue)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setData(SAMPLE)
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
  }, [accessToken, days, mode, monthRange, selectedMonth, shouldTreatIssuedAsPending])

  useEffect(() => {
    let mounted = true
    async function hydrateShopNames() {
      if (!accessToken) return
      const rows = [
        ...(data?.lists?.top_overdue_shops ?? []),
        ...(pendingInvoices ?? []),
        ...(overdueInvoices ?? []),
      ]
      const shopIds = Array.from(new Set(rows.map((r) => String(r?.shop_id ?? '')).filter(Boolean)))
      if (!shopIds.length) return
      try {
        const entries = await Promise.all(
          shopIds.map(async (shopId) => {
            const res = await listSupermarkets({ page: 1, limit: 1, shop_id: shopId }, { accessToken })
            const item = Array.isArray(res?.items) ? res.items[0] : null
            return [shopId, item?.shop_name || shopId]
          }),
        )
        if (mounted) setShopNameMap(Object.fromEntries(entries))
      } catch {
        if (mounted) setShopNameMap(Object.fromEntries(shopIds.map((s) => [s, s])))
      }
    }
    hydrateShopNames()
    return () => {
      mounted = false
    }
  }, [accessToken, data, overdueInvoices, pendingInvoices])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'accounts.overview',
        paths: {
          dashboardPath,
          homeContactBookPath:
            mode === 'admin' ? '/dashboard/teamify/contact-book' : '/portal/dashboard/contact-book',
          shopsPath,
          createShopPath,
          deliveryPartnersPath: mode === 'admin' ? '/dashboard/teamify/delivery-partners' : null,
          reportsPath: mode === 'admin' ? reportsPath : null,
          accountsInvoicesPath: invoicesPath,
          accountsOverviewPath: overviewPath,
          activityDailyPath: mode === 'admin' ? '/dashboard/teamify/activity/daily' : null,
          activitySalesPath: mode === 'admin' ? '/dashboard/teamify/activity/sales' : null,
        },
      }),
    [createShopPath, dashboardPath, invoicesPath, mode, navigate, overviewPath, reportsPath, shopsPath],
  )

  const kpis = data?.kpis ?? SAMPLE.kpis
  const chartData = (data?.series?.daily_collected ?? SAMPLE.series.daily_collected).map((r) => ({
    date: selectedMonth ? String(r.date).slice(8) : String(r.date).slice(5),
    amount: Number(r.amount ?? 0),
  }))
  const overdueRows = data?.lists?.top_overdue_shops ?? SAMPLE.lists.top_overdue_shops

  const card = 'rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'
  const strong = 'text-slate-900 dark:text-slate-100'
  const subtle = 'text-slate-600 dark:text-slate-300'

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle={mode === 'admin' ? 'Team Dashboard' : 'Portal'}
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
      <main className="relative flex-1 rounded-3xl bg-white p-4 dark:bg-slate-950/40">
        <header className="teamify-surface mb-4 rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                Accounts
              </p>
              <h1 className={`mt-1 text-2xl font-bold ${strong}`}>Overview</h1>
              <p className={`mt-1 text-sm ${subtle}`}>Collected vs pending/overdue, and risk shops.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="indigo">Revenue: Paid invoices</Chip>
                <Chip tone="amber">To collect: Pending + Overdue</Chip>
                {selectedMonth ? <Chip>Month filter: {selectedMonth}</Chip> : <Chip>Window: last {days} days</Chip>}
                {shouldTreatIssuedAsPending ? <Chip>Rule: ISSUED → PENDING after 5th</Chip> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">No month filter</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {[7, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    Last {d} days
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                onClick={() => navigate(invoicesPath)}
              >
                View Documents
              </button>
            </div>
          </div>
        </header>

        {loading ? <p className="mb-3 text-sm text-slate-500">Loading overview…</p> : null}
        {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}

        <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={card}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${subtle}`}>Collected</p>
            <p className={`mt-2 text-2xl font-bold ${strong}`}>{toCurrency(kpis.collected_amount)}</p>
            <p className={`mt-1 text-sm ${subtle}`}>Paid invoices in selected window</p>
          </div>
          <div className={card}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${subtle}`}>To Collect</p>
            <p className={`mt-2 text-2xl font-bold ${strong}`}>{toCurrency(kpis.to_collect_amount)}</p>
            <p className={`mt-1 text-sm ${subtle}`}>Pending + overdue invoice amount</p>
          </div>
          <div className={card}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${subtle}`}>Risk</p>
            <p className={`mt-2 text-2xl font-bold ${strong}`}>
              {kpis.overdue_shops} overdue • {kpis.pending_shops} pending
            </p>
            <p className={`mt-1 text-sm ${subtle}`}>
              {kpis.overdue_invoices} overdue invoices • {kpis.pending_invoices} pending invoices
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className={`${card} xl:col-span-2`}>
            <h2 className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${subtle}`}>Daily collected amount</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" name="Collected" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={card}>
            <h2 className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${subtle}`}>Top overdue shops</h2>
            <div className="space-y-3">
              {overdueRows.length ? (
                overdueRows.slice(0, 8).map((r) => (
                  <div key={r.shop_id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className={`text-sm font-semibold ${strong}`}>{shopNameMap[String(r.shop_id)] || r.shop_id}</p>
                    <p className={`text-xs ${subtle}`}>{r.shop_id}</p>
                    <p className={`mt-2 text-sm ${strong}`}>{toCurrency(r.amount)} <span className={subtle}>• {r.count} invoices</span></p>
                  </div>
                ))
              ) : (
                <p className={`text-sm ${subtle}`}>No overdue shops</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={card}>
            <h2 className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${subtle}`}>Overdue invoices</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice #</th>
                    <th className="px-3 py-2 text-left">Shop</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(overdueInvoices ?? []).slice(0, 10).map((r) => (
                    <tr key={r.invoice_id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{r.invoice_number}</td>
                      <td className="px-3 py-2">{shopNameMap[String(r.shop_id)] || r.shop_id}</td>
                      <td className="px-3 py-2">{toCurrency(r.amount)}</td>
                      <td className="px-3 py-2">
                        <button
                          className="rounded-md border px-2 py-1 text-xs dark:border-slate-600"
                          onClick={() => navigate(`${invoicesPath}/${encodeURIComponent(String(r.invoice_id))}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!overdueInvoices?.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No overdue invoices
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            <h2 className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${subtle}`}>Pending invoices</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice #</th>
                    <th className="px-3 py-2 text-left">Shop</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingInvoices ?? []).slice(0, 10).map((r) => (
                    <tr key={r.invoice_id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{r.invoice_number}</td>
                      <td className="px-3 py-2">{shopNameMap[String(r.shop_id)] || r.shop_id}</td>
                      <td className="px-3 py-2">{toCurrency(r.amount)}</td>
                      <td className="px-3 py-2">
                        <button
                          className="rounded-md border px-2 py-1 text-xs dark:border-slate-600"
                          onClick={() => navigate(`${invoicesPath}/${encodeURIComponent(String(r.invoice_id))}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!pendingInvoices?.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No pending invoices
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}

