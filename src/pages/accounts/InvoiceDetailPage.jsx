import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { useTheme } from '@/context/useTheme'
import { listSupermarkets } from '@/apis/supermarketsApi'
import {
  downloadAdminInvoice,
  downloadPortalInvoice,
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

function toCurrency(value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return String(value ?? '0')
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

function toDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function statusBadgeClass(status) {
  if (status === 'PAID') return 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600'
  if (status === 'OVERDUE') return 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600'
  if (status === 'PENDING') return 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600'
  if (status === 'VOID') return 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600'
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
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const accessToken = useSelector((state) => state.auth.session.accessToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [shopMeta, setShopMeta] = useState({ shopName: '', userId: '' })

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
          })
        }
      } catch {
        if (mounted) setShopMeta({ shopName: invoice.shop_id, userId: '—' })
      }
    }
    loadShopMeta()
    return () => {
      mounted = false
    }
  }, [accessToken, invoice?.shop_id])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'accounts.invoices',
        paths: {
          dashboardPath,
          shopsPath,
          createShopPath,
          deliveryPartnersPath: mode === 'admin' ? '/dashboard/teamify/delivery-partners' : null,
          reportsPath: mode === 'admin' ? reportsPath : null,
          accountsInvoicesPath: invoicesPath,
          accountsOverviewPath: overviewPath,
        },
      }),
    [createShopPath, dashboardPath, invoicesPath, mode, navigate, overviewPath, reportsPath, shopsPath],
  )

  const updateStatus = async (newStatus) => {
    if (!accessToken || !invoice?.invoice_id) return
    try {
      setError('')
      setInfo('')
      const payload =
        newStatus === 'PAID'
          ? { new_status: 'PAID', transaction_reference: `MANUAL-${Date.now()}` }
          : { new_status: newStatus }
      const updated =
        mode === 'portal'
          ? await updatePortalInvoiceStatus(invoice.invoice_id, payload, { accessToken })
          : await updateAdminInvoiceStatus(invoice.invoice_id, payload, { accessToken })
      setInvoice(updated)
      setInfo(`Status updated to ${newStatus}`)
    } catch (e) {
      setError(e?.message ?? 'Failed to update status')
    }
  }

  const saveNotes = async () => {
    if (!accessToken || !invoice?.invoice_id) return
    try {
      setError('')
      setInfo('')
      const updated =
        mode === 'portal'
          ? await updatePortalInvoice(invoice.invoice_id, { notes: notesDraft }, { accessToken })
          : await updateAdminInvoice(invoice.invoice_id, { notes: notesDraft }, { accessToken })
      setInvoice(updated)
      setInfo('Invoice updated')
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

  const downloadPlaceholder = async () => {
    if (!accessToken || !invoice?.invoice_id) return
    try {
      const result =
        mode === 'portal'
          ? await downloadPortalInvoice(invoice.invoice_id, { accessToken })
          : await downloadAdminInvoice(invoice.invoice_id, { accessToken })
      setInfo(result?.message ?? result?.code ?? 'Download endpoint called')
    } catch (e) {
      setError(e?.message ?? 'Failed to call download endpoint')
    }
  }

  const baseCardClass =
    'rounded-3xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900'
  const actionBtnClass =
    'rounded-2xl border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-white/10 dark:focus:ring-white/10'

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
                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadgeClass(invoice?.status)}`}>
                  {invoice?.status ?? '—'}
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

          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-xs text-slate-500 dark:text-slate-300">Total Amount</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{toCurrency(invoice?.amount)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-xs text-slate-500 dark:text-slate-300">Document Type</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{invoice?.document_type ?? '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-xs text-slate-500 dark:text-slate-300">Shop Name</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{shopMeta.shopName || invoice?.shop_id || '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <p className="text-xs text-slate-500 dark:text-slate-300">User ID</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{shopMeta.userId || '—'}</p>
            </div>
          </div>
        </div>

        {loading ? <p className="mb-3 text-sm text-slate-500">Loading invoice...</p> : null}
        {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
        {info ? <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{info}</p> : null}

        {invoice ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className={`${baseCardClass} p-4 xl:col-span-2`}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Invoice Information</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Billing Period Start</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{toDateTime(invoice.billing_period_start)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Billing Period End</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{toDateTime(invoice.billing_period_end)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Paid At</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{toDateTime(invoice.paid_at)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Transaction Ref</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">{invoice.transaction_reference ?? '—'}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">Notes (Editable)</p>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  rows={6}
                />
                <div className="mt-3">
                  <button className={actionBtnClass} onClick={saveNotes}>
                    Save Changes
                  </button>
                </div>
              </div>
            </section>

            <aside className={`${baseCardClass} p-4`}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {invoice.status !== 'PAID' ? (
                  <button
                    className={`${actionBtnClass} border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/45 dark:hover:bg-emerald-500/60`}
                    onClick={() => updateStatus('PAID')}
                  >
                    Mark Paid
                  </button>
                ) : null}
                <button
                  className={`${actionBtnClass} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-400 dark:bg-amber-500/45 dark:hover:bg-amber-500/60`}
                  onClick={() => updateStatus('OVERDUE')}
                >
                  Mark Overdue
                </button>
                <button
                  className={`${actionBtnClass} border-rose-500 bg-rose-600 text-white hover:bg-rose-700 dark:border-rose-400 dark:bg-rose-500/45 dark:hover:bg-rose-500/60`}
                  onClick={() => updateStatus('VOID')}
                >
                  Mark Void
                </button>
                <button
                  className={`${actionBtnClass} border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/45 dark:hover:bg-indigo-500/60`}
                  onClick={retryBill}
                >
                  Retry Bill
                </button>
                <button
                  className={`${actionBtnClass} border-sky-500 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500/45 dark:hover:bg-sky-500/60`}
                  onClick={() => sendEmail(false)}
                >
                  Send Email
                </button>
                <button
                  className={`${actionBtnClass} border-violet-500 bg-violet-600 text-white hover:bg-violet-700 dark:border-violet-400 dark:bg-violet-500/45 dark:hover:bg-violet-500/60`}
                  onClick={() => sendEmail(true)}
                >
                  Follow-up
                </button>
                <button
                  className={`${actionBtnClass} col-span-2 border-slate-400 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600`}
                  onClick={downloadPlaceholder}
                >
                  Download
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
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default InvoiceDetailPage

