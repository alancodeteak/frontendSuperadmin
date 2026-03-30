import { getReportsOverview } from '@/apis/reportsApi'
import { getAdminAccountsOverview, getPortalAccountsOverview } from '@/apis/invoicesApi'

const MOCK_MEMBERS = [
  { id: 1, name: 'Alex Carter', role: 'Product Designer', avatar: 'AC', status: 'Online', progress: 82 },
  { id: 2, name: 'Riya Sharma', role: 'Frontend Engineer', avatar: 'RS', status: 'Away', progress: 68 },
  { id: 3, name: 'Noah Wilson', role: 'Project Manager', avatar: 'NW', status: 'Online', progress: 91 },
  { id: 4, name: 'Maya Lopez', role: 'QA Engineer', avatar: 'ML', status: 'Offline', progress: 53 },
]

const SAMPLE_ADMIN_OVERVIEW = {
  kpis: {
    total_orders: 326,
    total_deliveries: 255,
    total_amount: 64250,
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
}

const SAMPLE_ACCOUNTS = {
  kpis: {
    collected_amount: 255000,
    to_collect_amount: 92000,
    pending_invoices: 11,
    overdue_invoices: 6,
  },
}

function daysForRange(range) {
  if (range === 'daily') return 1
  if (range === 'weekly') return 7
  return 30
}

function toInt(n) {
  const v = Number(n ?? 0)
  return Number.isFinite(v) ? Math.trunc(v) : 0
}

function formatNumber(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(toInt(n))
}

function formatCurrency(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
}

function formatDeltaPct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  const rounded = Math.round(n)
  if (rounded === 0) return '0%'
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

function deltaLabelForRange(range) {
  if (range === 'daily') return 'vs yesterday'
  if (range === 'weekly') return 'vs last week'
  return 'vs last 30 days'
}

function normalizePerformanceSeries(series) {
  const rows = Array.isArray(series) ? series : []
  return rows
    .map((r) => ({
      date: String(r?.date ?? ''),
      orders: toInt(r?.orders),
      revenue: Number(r?.amount ?? 0),
    }))
    .filter((r) => r.date)
}

export async function fetchDashboardData({ accessToken, range = 'weekly', mode = 'admin' } = {}) {
  if (!accessToken) {
    return { stats: [], members: MOCK_MEMBERS, performanceSeries: [] }
  }

  if (mode === 'portal') {
    let acct = null
    try {
      acct = await getPortalAccountsOverview({ days: 30 }, { accessToken })
    } catch {
      acct = SAMPLE_ACCOUNTS
    }
    const a = acct?.kpis ?? {}
    const collected = Number(a.collected_amount ?? 0)
    const toCollect = Number(a.to_collect_amount ?? 0)
    return {
      members: MOCK_MEMBERS,
      performanceSeries: [],
      stats: [
        { id: 'collected', label: 'Collected (current)', value: formatCurrency(collected), delta: '', deltaLabel: '' },
        { id: 'toCollect', label: 'To collect (current)', value: formatCurrency(toCollect), delta: '', deltaLabel: '' },
        {
          id: 'pendingInvoices',
          label: 'Pending invoices',
          value: formatNumber(a.pending_invoices),
          delta: '',
          deltaLabel: '',
        },
        {
          id: 'overdueInvoices',
          label: 'Overdue invoices',
          value: formatNumber(a.overdue_invoices),
          delta: '',
          deltaLabel: '',
        },
      ],
    }
  }

  const days = daysForRange(range)
  let ov = null
  let acct = null
  try {
    ;[ov, acct] = await Promise.all([
      getReportsOverview({ days }, { accessToken }),
      getAdminAccountsOverview({ days: 30 }, { accessToken }),
    ])
  } catch {
    ov = SAMPLE_ADMIN_OVERVIEW
    acct = SAMPLE_ACCOUNTS
  }

  const k = ov?.kpis ?? {}
  const g = ov?.growth ?? {}
  const a = acct?.kpis ?? {}

  const collected = Number(a.collected_amount ?? 0)
  const toCollect = Number(a.to_collect_amount ?? 0)

  return {
    members: MOCK_MEMBERS,
    performanceSeries: normalizePerformanceSeries(ov?.series),
    stats: [
      {
        id: 'orders',
        label: 'Orders',
        value: formatNumber(k.total_orders),
        delta: formatDeltaPct(g.orders_pct_vs_prev_period),
        deltaLabel: deltaLabelForRange(range),
      },
      {
        id: 'revenue',
        label: 'Revenue',
        value: formatCurrency(k.total_amount),
        delta: formatDeltaPct(g.amount_pct_vs_prev_period),
        deltaLabel: deltaLabelForRange(range),
      },
      {
        id: 'deliveries',
        label: 'Deliveries',
        value: formatNumber(k.total_deliveries),
        delta: '',
        deltaLabel: deltaLabelForRange(range),
      },
      {
        id: 'collections',
        label: 'Collections (current)',
        value: formatCurrency(collected),
        delta: toCollect > 0 ? `To collect ${formatCurrency(toCollect)}` : '',
        deltaLabel: '',
      },
    ],
  }
}
