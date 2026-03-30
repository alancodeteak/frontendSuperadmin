import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatCard from '@/components/common/StatCard'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { useTheme } from '@/context/useTheme'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { getSupermarket, listSupermarkets } from '@/apis/supermarketsApi'
import SubscriptionInvoiceDocument from '@/components/invoice/SubscriptionInvoiceDocument'
import { downloadInvoicePdfFromElement, safeInvoiceFilename } from '@/utils/invoicePdfDownload'
import {
  allowedInvoiceStatusTargets,
  INVOICE_STATUS_LABELS,
  isKnownInvoiceStatus,
  localDatetimeToPaidAtIso,
  normalizeInvoiceStatus,
} from '@/utils/invoiceStatusProtocol'
import {
  getAdminInvoice,
  getPortalInvoice,
  retryAdminBill,
  retryPortalBill,
  sendAdminInvoiceEmail,
  sendAdminInvoiceFollowup,
  sendPortalInvoiceEmail,
  sendPortalInvoiceFollowup,
  updateAdminInvoice,
  updateAdminInvoiceStatus,
  updatePortalInvoice,
  updatePortalInvoiceStatus,
} from '@/apis/invoicesApi'
import {
  deleteNoteCommandSchema,
  invoiceNoteMessageSchema,
  invoiceStatusSchema,
  transactionReferenceSchema,
} from '@/validation/schemas/invoiceSchemas'
import { firstIssueMessage } from '@/validation/validate'

function toCurrency(value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return String(value ?? '0')
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

function parseInvoiceNotesLog(raw) {
  if (!raw) return []
  const text = String(raw).trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .map(([k, v]) => {
          const full = String(v ?? '')
          const m = full.match(/^(.*)\[(.+?)\]\s*$/)
          if (m) {
            return { id: String(k), text: m[1].trim(), timestamp: m[2].trim(), raw: full }
          }
          return { id: String(k), text: full, timestamp: '', raw: full }
        })
        .sort((a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10))
    }
  } catch {
    // fall through and treat as a single legacy note
  }
  return [{ id: '1', text, timestamp: '', raw: text }]
}

function toDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)

  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const day = d.getDate()
  const month = monthNames[d.getMonth()] ?? ''
  const year = d.getFullYear()

  const j = day % 10
  const k = day % 100
  let suffix = 'th'
  if (j === 1 && k !== 11) suffix = 'st'
  else if (j === 2 && k !== 12) suffix = 'nd'
  else if (j === 3 && k !== 13) suffix = 'rd'

  return `${hour12}:${minutes} ${ampm} ${month} ${day}${suffix} ${year}`
}

function statusBadgeClass(status) {
  if (status === 'PAID') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/60'
  }
  if (status === 'OVERDUE') {
    return 'bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/70'
  }
  if (status === 'PENDING') {
    return 'bg-sky-50 text-sky-900 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/70'
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-900 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-100 dark:ring-rose-400/70'
  }
  if (status === 'VOID') {
    return 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-500/80'
  }
  if (status === 'ISSUED') {
    return 'bg-indigo-50 text-indigo-900 ring-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-400/70'
  }
  return 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600'
}

function InvoiceDetailPage({
  mode = 'admin',
  brandTitle = 'Teamify',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createShopPath = '/dashboard/teamify/shops/create',
  invoicesPath = '/dashboard/teamify/accounts/invoices',
  reportsPath = '/dashboard/teamify/reports',
  overviewPath = '/dashboard/teamify/accounts/overview',
}) {
  const { invoiceId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const accessToken = useSelector((state) => state.auth.session.accessToken)
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')
  const [paidTxRefDraft, setPaidTxRefDraft] = useState('')
  const [paidAtLocal, setPaidAtLocal] = useState('')
  const [shopMeta, setShopMeta] = useState({ shopName: '', userId: '', phone: null })
  const [shopInvoiceContext, setShopInvoiceContext] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const invoicePdfRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      if (!accessToken || !invoiceId) return
      setLoading(true)
      setError('')
      try {
        const data =
          mode === 'portal'
            ? await getPortalInvoice(invoiceId, { accessToken })
            : await getAdminInvoice(invoiceId, { accessToken })
        if (mounted) {
          setInvoice(data ?? null)
          setNotesDraft(data?.notes ?? '')
        }
      } catch (e) {
        if (mounted) setError(e?.message ?? 'Failed to load invoice')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [accessToken, invoiceId, mode])

  useEffect(() => {
    let mounted = true
    async function loadShopMeta() {
      if (!accessToken || !invoice?.shop_id) return
      try {
        const res = await listSupermarkets({ page: 1, limit: 1, shop_id: invoice.shop_id }, { accessToken })
        const item = Array.isArray(res?.items) ? res.items[0] : null
        if (mounted) {
          setShopMeta({
            shopName: item?.shop_name || invoice.shop_id,
            userId: item?.user_id != null ? String(item.user_id) : '—',
            phone: item?.phone ?? null,
          })
        }
        if (mounted && item?.user_id != null) {
          try {
            const detail = await getSupermarket({ user_id: item.user_id }, { accessToken })
            if (mounted) setShopInvoiceContext(detail ?? null)
          } catch {
            if (mounted) setShopInvoiceContext(null)
          }
        } else if (mounted) {
          setShopInvoiceContext(null)
        }
      } catch {
        if (mounted) {
          setShopMeta({ shopName: String(invoice.shop_id), userId: '—', phone: null })
          setShopInvoiceContext(null)
        }
      }
    }
    loadShopMeta()
    return () => {
      mounted = false
    }
  }, [accessToken, invoice?.shop_id])

  useEffect(() => {
    setPendingStatus('')
    setPaidTxRefDraft('')
    setPaidAtLocal('')
  }, [invoice?.invoice_id, invoice?.status])

  const statusTargets = useMemo(() => allowedInvoiceStatusTargets(invoice?.status), [invoice?.status])
  const statusRecognized = isKnownInvoiceStatus(invoice?.status)
  const normalizedCurrentStatus = normalizeInvoiceStatus(invoice?.status)

  const accountsSidebarKey =
    String(invoice?.document_type ?? '').toUpperCase() === 'BILL' ? 'accounts.billing' : 'accounts.invoices'

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: accountsSidebarKey,
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
    [accountsSidebarKey, createShopPath, dashboardPath, invoicesPath, mode, navigate, overviewPath, reportsPath, shopsPath],
  )

  const updateStatus = async (newStatus, { transaction_reference: txRef, paid_at: paidAtIso } = {}) => {
    if (!accessToken || !invoice?.invoice_id) return
    try {
      setError('')
      setInfo('')
      const statusResult = invoiceStatusSchema.safeParse(String(newStatus || '').toUpperCase())
      if (!statusResult.success) {
        setError(firstIssueMessage(statusResult.error, 'Invalid status'))
        return
      }
      const resolvedStatus = statusResult.data
      const payload = { new_status: newStatus }
      if (resolvedStatus === 'PAID') {
        const trimmedTx = (txRef && String(txRef).trim()) || `MANUAL-${Date.now()}`
        const txResult = transactionReferenceSchema.safeParse(trimmedTx)
        if (!txResult.success) {
          setError(firstIssueMessage(txResult.error, 'Invalid transaction reference'))
          return
        }
        payload.transaction_reference = txResult.data
        if (paidAtIso) payload.paid_at = paidAtIso
      }
      const updated =
        mode === 'portal'
          ? await updatePortalInvoiceStatus(invoice.invoice_id, payload, { accessToken })
          : await updateAdminInvoiceStatus(invoice.invoice_id, payload, { accessToken })
      setInvoice(updated)
      setInfo(`Status updated to ${resolvedStatus}`)
    } catch (e) {
      setError(e?.message ?? 'Failed to update status')
    }
  }

  const saveNotes = async () => {
    if (!accessToken || !invoice?.invoice_id) return
    const noteResult = invoiceNoteMessageSchema.safeParse(notesDraft)
    if (!noteResult.success) {
      setError(firstIssueMessage(noteResult.error, 'Invalid note'))
      return
    }
    try {
      setError('')
      setInfo('')
      const updated =
        mode === 'portal'
          ? await updatePortalInvoice(invoice.invoice_id, { notes: noteResult.data }, { accessToken })
          : await updateAdminInvoice(invoice.invoice_id, { notes: noteResult.data }, { accessToken })
      setInvoice(updated)
      setNotesDraft('')
      setInfo('Note added to invoice')
    } catch (e) {
      setError(e?.message ?? 'Failed to update invoice')
    }
  }

  const sendEmail = async (followup = false) => {
    if (!accessToken || !invoice?.invoice_id) return
    try {
      setError('')
      setInfo('')
      const result = followup
        ? mode === 'portal'
          ? await sendPortalInvoiceFollowup(invoice.invoice_id, { accessToken })
          : await sendAdminInvoiceFollowup(invoice.invoice_id, { accessToken })
        : mode === 'portal'
          ? await sendPortalInvoiceEmail(invoice.invoice_id, { accessToken })
          : await sendAdminInvoiceEmail(invoice.invoice_id, { accessToken })
      setInfo(result?.code ?? 'Email action triggered')
    } catch (e) {
      setError(e?.message ?? 'Failed to send email')
    }
  }

  const retryBill = async () => {
    if (!accessToken || !invoice?.invoice_id) return
    try {
      setError('')
      setInfo('')
      const bill =
        mode === 'portal'
          ? await retryPortalBill(invoice.invoice_id, { accessToken })
          : await retryAdminBill(invoice.invoice_id, { accessToken })
      setInfo(`Bill ready: ${bill?.invoice_number ?? 'created'}`)
    } catch (e) {
      setError(e?.message ?? 'Failed to retry bill')
    }
  }

  const isBillDocument = String(invoice?.document_type ?? '').toUpperCase() === 'BILL'
  const docKindLabel = isBillDocument ? 'Bill' : 'Invoice'

  const downloadInvoicePdf = async () => {
    if (!invoice?.invoice_id) return
    try {
      setError('')
      setInfo('')
      setDownloadingPdf(true)
      const el = invoicePdfRef.current
      if (!el) throw new Error('Invoice document is not ready for PDF export')
      const name = safeInvoiceFilename(invoice.invoice_number, invoice.invoice_id)
      await downloadInvoicePdfFromElement(el, name)
      setInfo(`${docKindLabel} PDF downloaded`)
    } catch (e) {
      setError(e?.message ?? 'Failed to generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const baseCardClass =
    'rounded-3xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900'
  const actionBtnClass =
    'rounded-2xl border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-white/10 dark:focus:ring-white/10'

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(mode === 'portal' ? '/portal/login' : '/', { replace: true })
  }

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle={mode === 'admin' ? 'Team Dashboard' : 'Portal'}
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <main className="relative flex-1 rounded-3xl bg-white p-4 dark:bg-slate-950/40">
        <div className={`${baseCardClass} mb-4 overflow-hidden`}>
          <div className="border-b border-slate-200 p-5 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Accounts / Invoice</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {invoice?.invoice_number ?? `Invoice #${invoiceId}`}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {shopMeta.shopName || '—'} • User ID: {shopMeta.userId || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadgeClass(
                    normalizedCurrentStatus || invoice?.status,
                  )}`}
                  title={normalizedCurrentStatus ? undefined : `Raw status from API: ${invoice?.status ?? ''}`}
                >
                  {normalizedCurrentStatus || invoice?.status || '—'}
                </span>
                <button
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  onClick={() => navigate(invoicesPath)}
                >
                  Back to Invoices
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Invoice Amount"
              value={toCurrency(invoice?.amount)}
              delta={invoice?.status === 'PAID' ? 'Collected' : 'To collect'}
              compact
            />
            <StatCard
              label="Document Type"
              value={invoice?.document_type ?? '—'}
              delta={isBillDocument ? 'Billing document' : 'Subscription invoice'}
              compact
            />
            <StatCard
              label="Shop"
              value={shopMeta.shopName || invoice?.shop_id || '—'}
              delta={shopMeta.userId ? `User ID ${shopMeta.userId}` : 'No user linked'}
              compact
            />
            <StatCard
              label="Period"
              value={
                invoice?.billing_period_start && invoice?.billing_period_end
                  ? `${toDateTime(invoice.billing_period_start)}`
                  : 'Not set'
              }
              delta={
                invoice?.billing_period_start && invoice?.billing_period_end
                  ? `to ${toDateTime(invoice.billing_period_end)}`
                  : 'Billing window'
              }
              compact
            />
          </div>
        </div>

        {loading ? <p className="mb-3 text-sm text-slate-500">Loading invoice...</p> : null}
        {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
        {info ? <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{info}</p> : null}

        {invoice ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className={`${baseCardClass} p-4 xl:col-span-2`}>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  Invoice Information
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-500 dark:text-slate-300">Billing Period Start</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {toDateTime(invoice.billing_period_start)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-500 dark:text-slate-300">Billing Period End</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {toDateTime(invoice.billing_period_end)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-500 dark:text-slate-300">Paid At</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {toDateTime(invoice.paid_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-500 dark:text-slate-300">Transaction Ref</p>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {invoice.transaction_reference ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-3 dark:border-slate-600 dark:bg-slate-900/40">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                      Invoice preview
                    </p>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Same layout as the downloaded PDF
                    </span>
                  </div>
                  <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-950">
                    <SubscriptionInvoiceDocument
                      invoice={invoice}
                      shop={{
                        shop_name: shopInvoiceContext?.shop_owner?.shop_name ?? shopMeta.shopName,
                        user_id:
                          shopInvoiceContext?.shop_owner?.user_id != null
                            ? String(shopInvoiceContext.shop_owner.user_id)
                            : shopMeta.userId !== '—'
                              ? shopMeta.userId
                              : undefined,
                        email: shopInvoiceContext?.shop_owner?.email ?? undefined,
                        phone: shopInvoiceContext?.shop_owner?.phone ?? shopMeta.phone ?? undefined,
                      }}
                      subscription={{ subscription_id: invoice.subscription_id }}
                      address={shopInvoiceContext?.address ?? undefined}
                    />
                  </div>
                </div>
              </section>

              <aside className={`${baseCardClass} p-4`}>
                <h2 className="mb-1 flex items-center justify-between text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  <span>Actions</span>
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-slate-100 dark:text-slate-900">
                    Status &amp; Controls
                  </span>
                </h2>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  Update status and notes; trigger retries, emails and exports.
                </p>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-emerald-50/70 p-3 dark:border-slate-600 dark:from-slate-900/60 dark:via-slate-900 dark:to-emerald-950/30">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Change status</p>
                  <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                    Current:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {normalizedCurrentStatus || invoice.status}
                    </span>
                    {invoice.status && normalizedCurrentStatus !== String(invoice.status).trim().toUpperCase() ? (
                      <span className="block text-[11px] opacity-80">(API value: {invoice.status})</span>
                    ) : null}
                  </p>
                  {invoice.status && !statusRecognized ? (
                    <p className="mb-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                      This value is not a known <code className="rounded bg-amber-100 px-0.5 dark:bg-amber-900/50">InvoiceStatus</code>. Status
                      changes are disabled until the value matches the server model.
                    </p>
                  ) : null}
                  {statusRecognized && statusTargets.length > 0 ? (
                    <>
                      <select
                        value={pendingStatus}
                        onChange={(e) => {
                          const v = e.target.value
                          setPendingStatus(v)
                          if (v !== 'PAID') {
                            setPaidTxRefDraft('')
                            setPaidAtLocal('')
                          }
                        }}
                        className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">Select new status…</option>
                        {statusTargets.map((s) => (
                          <option key={s} value={s}>
                            {s} — {INVOICE_STATUS_LABELS[s] ?? s}
                          </option>
                        ))}
                      </select>
                      {pendingStatus === 'PAID' ? (
                        <>
                          <label className="mb-2 block text-xs text-slate-600 dark:text-slate-300">
                            <span className="mb-1 block font-medium">Transaction reference</span>
                            <span className="mb-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              Required by the API when setting PAID. Leave blank to send an auto-generated manual reference.
                            </span>
                            <input
                              type="text"
                              value={paidTxRefDraft}
                              onChange={(e) => setPaidTxRefDraft(e.target.value)}
                              placeholder="UTR / gateway ref (optional)"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </label>
                          <label className="mb-2 block text-xs text-slate-600 dark:text-slate-300">
                            <span className="mb-1 block font-medium">Paid at</span>
                            <span className="mb-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              Optional. If omitted, the server uses the current time. Cannot be in the future.
                            </span>
                            <input
                              type="datetime-local"
                              value={paidAtLocal}
                              onChange={(e) => setPaidAtLocal(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </label>
                          {String(invoice.document_type ?? '').toUpperCase() === 'INVOICE' ? (
                            <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                              For document type INVOICE, marking as PAID may trigger bill generation on the server.
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      <button
                        type="button"
                        disabled={!pendingStatus}
                        className={`${actionBtnClass} w-full border-slate-900 bg-slate-900 text-white hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600`}
                        onClick={() => {
                          const paidAtIso =
                            pendingStatus === 'PAID' ? localDatetimeToPaidAtIso(paidAtLocal) : null
                          updateStatus(pendingStatus, {
                            transaction_reference: pendingStatus === 'PAID' ? paidTxRefDraft : undefined,
                            paid_at: paidAtIso || undefined,
                          })
                        }}
                      >
                        Apply status
                      </button>
                      <details className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <summary className="cursor-pointer select-none text-slate-600 dark:text-slate-300">
                          Status rules (same as server)
                        </summary>
                        <ul className="mt-2 list-disc space-y-1.5 pl-4">
                          <li>
                            <strong className="font-medium text-slate-600 dark:text-slate-300">ISSUED</strong> → PENDING, PAID, VOID,
                            FAILED
                          </li>
                          <li>
                            <strong className="font-medium text-slate-600 dark:text-slate-300">PENDING</strong> → PAID, OVERDUE, VOID,
                            FAILED
                          </li>
                          <li>
                            <strong className="font-medium text-slate-600 dark:text-slate-300">OVERDUE</strong> → PAID, VOID
                          </li>
                          <li>
                            <strong className="font-medium text-slate-600 dark:text-slate-300">FAILED</strong> → ISSUED, PENDING, VOID
                          </li>
                          <li>
                            <strong className="font-medium text-slate-600 dark:text-slate-300">PAID</strong> → VOID only
                          </li>
                          <li>
                            <strong className="font-medium text-slate-600 dark:text-slate-300">VOID</strong> → no moves (terminal)
                          </li>
                          <li>Automation can move ISSUED → PENDING after the 5th and PENDING → OVERDUE by schedule.</li>
                        </ul>
                      </details>
                    </>
                  ) : statusRecognized ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No further status changes are allowed for this invoice.</p>
                  ) : null}
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Notes timeline
                  </p>
                  <div className="mb-3 max-h-40 space-y-1.5 overflow-auto rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    {parseInvoiceNotesLog(invoice?.notes).length === 0 ? (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">No notes yet. Add the first one below.</p>
                    ) : (
                      parseInvoiceNotesLog(invoice?.notes).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:ring-slate-800"
                        >
                          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                            {entry.id}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium">
                                  {entry.text || '(no message)'}
                                </p>
                                {entry.timestamp ? (
                                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    {entry.text === 'deleted' ? 'Deleted at' : 'Added at'} {entry.timestamp}
                                  </p>
                                ) : null}
                              </div>
                              {entry.text !== 'deleted' ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!accessToken || !invoice?.invoice_id) return
                                    try {
                                      setError('')
                                      setInfo('')
                                      const cmd = `__DELETE_NOTE_ID__:${entry.id}`
                                      const cmdResult = deleteNoteCommandSchema.safeParse(cmd)
                                      if (!cmdResult.success) {
                                        setError(firstIssueMessage(cmdResult.error, 'Invalid delete request'))
                                        return
                                      }
                                      const payload = { notes: cmdResult.data }
                                      const updated =
                                        mode === 'portal'
                                          ? await updatePortalInvoice(invoice.invoice_id, payload, { accessToken })
                                          : await updateAdminInvoice(invoice.invoice_id, payload, { accessToken })
                                      setInvoice(updated)
                                      setInfo(`Note #${entry.id} marked as deleted`)
                                    } catch (e) {
                                      setError(e?.message ?? 'Failed to delete note')
                                    }
                                  }}
                                  className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/60"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="mb-1 block font-medium">Add note</span>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      rows={3}
                      placeholder="Internal note (we'll append it with timestamp)…"
                    />
                  </label>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!notesDraft.trim()}
                      className={`${actionBtnClass} border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40 dark:border-indigo-400 dark:bg-indigo-500/45 dark:hover:bg-indigo-500/60`}
                      onClick={saveNotes}
                    >
                      Add note
                    </button>
                  </div>
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Communications &amp; export
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`${actionBtnClass} border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/45 dark:hover:bg-indigo-500/60`}
                    onClick={retryBill}
                  >
                    Retry Bill
                  </button>
                  <button
                    type="button"
                    className={`${actionBtnClass} border-sky-500 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500/45 dark:hover:bg-sky-500/60`}
                    onClick={() => sendEmail(false)}
                  >
                    Send Email
                  </button>
                  <button
                    type="button"
                    className={`${actionBtnClass} col-span-2 border-violet-500 bg-violet-600 text-white hover:bg-violet-700 dark:border-violet-400 dark:bg-violet-500/45 dark:hover:bg-violet-500/60`}
                    onClick={() => sendEmail(true)}
                  >
                    Follow-up
                  </button>
                  <button
                    type="button"
                    disabled={downloadingPdf}
                    className={`${actionBtnClass} col-span-2 border-slate-400 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600`}
                    onClick={downloadInvoicePdf}
                  >
                    {downloadingPdf ? 'Preparing PDF…' : `Download ${docKindLabel}`}
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Tax Breakdown</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p>CGST: {toCurrency(invoice.cgst)}</p>
                    <p>SGST: {toCurrency(invoice.sgst)}</p>
                    <p>IGST: {toCurrency(invoice.igst)}</p>
                    <p>Discount: {toCurrency(invoice.discount)}</p>
                    <p>Other Charges: {toCurrency(invoice.other_charges)}</p>
                  </div>
                </div>
              </aside>
            </div>

            {/* Off-screen render for PDF (html2canvas); not shown on the page */}
            <div
              className="pointer-events-none fixed top-0 -left-[10000px] z-0 w-[900px] max-w-[100vw] bg-white text-black"
              aria-hidden
            >
              <SubscriptionInvoiceDocument
                ref={invoicePdfRef}
                invoice={invoice}
                shop={{
                  shop_name: shopInvoiceContext?.shop_owner?.shop_name ?? shopMeta.shopName,
                  user_id:
                    shopInvoiceContext?.shop_owner?.user_id != null
                      ? String(shopInvoiceContext.shop_owner.user_id)
                      : shopMeta.userId !== '—'
                        ? shopMeta.userId
                        : undefined,
                  email: shopInvoiceContext?.shop_owner?.email ?? undefined,
                  phone: shopInvoiceContext?.shop_owner?.phone ?? shopMeta.phone ?? undefined,
                }}
                subscription={{ subscription_id: invoice.subscription_id }}
                address={shopInvoiceContext?.address ?? undefined}
              />
            </div>
          </>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default InvoiceDetailPage

