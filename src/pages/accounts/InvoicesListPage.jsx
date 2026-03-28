import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import SubscriptionInvoiceDocument from '@/components/invoice/SubscriptionInvoiceDocument'
import { useTheme } from '@/context/useTheme'
import {
  createAdminInvoice,
  getAdminInvoice,
  getPortalInvoice,
  listAdminInvoices,
  listPortalInvoices,
} from '@/apis/invoicesApi'
import { getSupermarket, listSupermarkets } from '@/apis/supermarketsApi'
import { downloadInvoicePdfFromElement, safeInvoiceFilename } from '@/utils/invoicePdfDownload'

function getStatusBadgeClass(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30'
    case 'OVERDUE':
      return 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/30'
    case 'PENDING':
      return 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30'
    case 'ISSUED':
      return 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/30'
    case 'VOID':
      return 'bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600'
    case 'FAILED':
      return 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-400/30'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600'
  }
}

function InvoicesListPage({
  mode = 'admin',
  brandTitle = 'Teamify',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createShopPath = '/dashboard/teamify/shops/create',
  invoicesPath = '/dashboard/teamify/accounts/invoices',
  detailPathBase = '/dashboard/teamify/accounts/invoices',
  reportsPath = '/dashboard/teamify/reports',
  overviewPath = '/dashboard/teamify/accounts/overview',
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { themeMode, toggleTheme } = useTheme()
  const accessToken = useSelector((state) => state.auth.session.accessToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [shopMetaMap, setShopMetaMap] = useState({})
  const [status, setStatus] = useState('')
  const [documentType, setDocumentType] = useState(() => {
    const v = (searchParams.get('document_type') || '').toUpperCase()
    return v === 'BILL' || v === 'INVOICE' ? v : ''
  })

  useEffect(() => {
    const v = (searchParams.get('document_type') || '').toUpperCase()
    if (v === 'BILL' || v === 'INVOICE') setDocumentType(v)
    else setDocumentType('')
  }, [searchParams])

  const [query, setQuery] = useState('')
  const [shopFilter, setShopFilter] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  const previewPdfRef = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [previewShopDetail, setPreviewShopDetail] = useState(null)
  const [previewMeta, setPreviewMeta] = useState({ shopName: '', userId: '—', phone: null })
  const [previewDownloadingPdf, setPreviewDownloadingPdf] = useState(false)

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewError('')
    setPreviewInvoice(null)
    setPreviewShopDetail(null)
    setPreviewMeta({ shopName: '', userId: '—', phone: null })
  }, [])

  const openPreview = useCallback(
    async (invoiceId) => {
      if (!accessToken || !invoiceId) return
      setPreviewOpen(true)
      setPreviewLoading(true)
      setPreviewError('')
      setPreviewInvoice(null)
      setPreviewShopDetail(null)
      setPreviewMeta({ shopName: '', userId: '—', phone: null })
      try {
        const inv =
          mode === 'portal'
            ? await getPortalInvoice(invoiceId, { accessToken })
            : await getAdminInvoice(invoiceId, { accessToken })
        if (!inv) {
          setPreviewError('Document not found')
          return
        }
        setPreviewInvoice(inv)
        const sid = String(inv.shop_id ?? '')
        let shopName = sid
        let userId = '—'
        let phone = null
        try {
          const res = await listSupermarkets({ page: 1, limit: 1, shop_id: sid }, { accessToken })
          const item = Array.isArray(res?.items) ? res.items[0] : null
          if (item) {
            shopName = item.shop_name || sid
            userId = item.user_id != null ? String(item.user_id) : '—'
            phone = item.phone ?? null
          }
        } catch {
          /* use ids only */
        }
        setPreviewMeta({ shopName, userId, phone })
        if (userId !== '—') {
          const uid = Number(userId)
          if (!Number.isNaN(uid)) {
            try {
              const detail = await getSupermarket({ user_id: uid }, { accessToken })
              setPreviewShopDetail(detail ?? null)
            } catch {
              setPreviewShopDetail(null)
            }
          }
        }
      } catch (e) {
        setPreviewError(e?.message ?? 'Failed to load preview')
      } finally {
        setPreviewLoading(false)
      }
    },
    [accessToken, mode],
  )

  const downloadPreviewPdf = useCallback(async () => {
    if (!previewInvoice?.invoice_id) return
    const isBill = String(previewInvoice.document_type ?? '').toUpperCase() === 'BILL'
    const label = isBill ? 'Bill' : 'Invoice'
    try {
      setPreviewError('')
      setPreviewDownloadingPdf(true)
      const el = previewPdfRef.current
      if (!el) throw new Error('Preview is not ready')
      const name = safeInvoiceFilename(previewInvoice.invoice_number, previewInvoice.invoice_id)
      await downloadInvoicePdfFromElement(el, name)
    } catch (e) {
      setPreviewError(e?.message ?? `Failed to generate ${label} PDF`)
    } finally {
      setPreviewDownloadingPdf(false)
    }
  }, [previewInvoice])

  useEffect(() => {
    if (!previewOpen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [previewOpen, closePreview])

  useEffect(() => {
    let mounted = true
    async function run() {
      if (!accessToken) return
      setLoading(true)
      setError('')
      try {
        const params = {
          page: String(page),
          limit: '20',
          ...(status ? { status } : {}),
          ...(documentType ? { document_type: documentType } : {}),
        }
        const data =
          mode === 'portal'
            ? await listPortalInvoices(params, { accessToken })
            : await listAdminInvoices(params, { accessToken })
        if (mounted) {
          const list = Array.isArray(data) ? data : []
          setRawRows(list)
        }
      } catch (e) {
        if (mounted) setError(e?.message ?? 'Failed to load invoices')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [accessToken, mode, page, status, documentType])

  useEffect(() => {
    let mounted = true
    async function loadShopNames() {
      if (!accessToken) return
      const shopIds = Array.from(
        new Set((rawRows ?? []).map((r) => String(r?.shop_id ?? '')).filter(Boolean)),
      )
      if (!shopIds.length) {
        if (mounted) setShopMetaMap({})
        return
      }
      try {
        const entries = await Promise.all(
          shopIds.map(async (shopId) => {
            const res = await listSupermarkets({ page: 1, limit: 1, shop_id: shopId }, { accessToken })
            const item = Array.isArray(res?.items) ? res.items[0] : null
            return [
              shopId,
              {
                shopName: item?.shop_name || shopId,
                userId: item?.user_id != null ? String(item.user_id) : '—',
              },
            ]
          }),
        )
        if (mounted) setShopMetaMap(Object.fromEntries(entries))
      } catch {
        if (mounted) {
          const fallback = Object.fromEntries(shopIds.map((s) => [s, { shopName: s, userId: '—' }]))
          setShopMetaMap(fallback)
        }
      }
    }
    loadShopNames()
    return () => {
      mounted = false
    }
  }, [accessToken, rawRows])

  const shopOptions = useMemo(() => {
    const map = new Map()
    for (const row of rawRows ?? []) {
      const shopId = String(row?.shop_id ?? '')
      if (!shopId) continue
      const meta = shopMetaMap[shopId] || { shopName: shopId, userId: '—' }
      map.set(shopId, `${meta.shopName} (UID: ${meta.userId})`)
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [rawRows, shopMetaMap])

  const rowsFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rawRows ?? []).filter((row) => {
      const sid = String(row?.shop_id ?? '')
      const meta = shopMetaMap[sid] || { shopName: sid, userId: '' }
      const sname = String(meta.shopName ?? sid).toLowerCase()
      const uid = String(meta.userId ?? '').toLowerCase()
      const invoiceNo = String(row?.invoice_number ?? '').toLowerCase()
      if (shopFilter !== 'all' && sid !== shopFilter) return false
      if (!q) return true
      return invoiceNo.includes(q) || sid.toLowerCase().includes(q) || sname.includes(q) || uid.includes(q)
    })
  }, [query, rawRows, shopFilter, shopMetaMap])

  useEffect(() => {
    setRows(rowsFiltered)
  }, [rowsFiltered])

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: documentType === 'BILL' ? 'accounts.billing' : 'accounts.invoices',
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
    [createShopPath, dashboardPath, documentType, invoicesPath, mode, navigate, overviewPath, reportsPath, shopsPath],
  )

  const createManualInvoice = async () => {
    if (mode !== 'admin' || !accessToken) return
    try {
      setError('')
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString()
      const payload = {
        subscription_id: 1,
        shop_id: window.prompt('Enter shop_id') || '',
        invoice_number: window.prompt('Enter invoice number (e.g. INV-202603-9999)') || '',
        billing_period_start: monthStart,
        billing_period_end: monthEnd,
        amount: '0',
        discount: '0',
        other_charges: '0',
        cgst: '0',
        igst: '0',
        sgst: '0',
        document_type: 'INVOICE',
        status: 'ISSUED',
      }
      if (!payload.shop_id || !payload.invoice_number) return
      await createAdminInvoice(payload, { accessToken })
      const data = await listAdminInvoices({ page: String(page), limit: '20', ...(status ? { status } : {}) }, { accessToken })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message ?? 'Failed to create manual invoice')
    }
  }

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
          <h1 className="text-2xl font-bold text-black dark:text-slate-100">Accounts / Invoices</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Search, filter, and review invoices by shop.</p>
        </header>

        <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice #, shop name, shop id"
              
              className="w-full max-w-[420px] rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm dark:border-slate-600"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                Filters {filtersOpen ? '▲' : '▼'}
              </button>
              {mode === 'admin' ? (
                <button className="rounded-xl border px-3 py-2 text-sm dark:border-slate-600" onClick={createManualInvoice}>
                  Create Manual
                </button>
              ) : null}
            </div>
          </div>
          {filtersOpen ? (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Shop
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="all">All Shops</option>
                  {shopOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1)
                    setStatus(e.target.value)
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">All Statuses</option>
                  <option value="ISSUED">ISSUED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="FAILED">FAILED</option>
                  <option value="VOID">VOID</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Document Type
                <select
                  value={documentType}
                  onChange={(e) => {
                    const v = e.target.value
                    setPage(1)
                    setDocumentType(v)
                    const next = new URLSearchParams(searchParams)
                    if (v) next.set('document_type', v)
                    else next.delete('document_type')
                    setSearchParams(next, { replace: true })
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">All</option>
                  <option value="INVOICE">Invoices</option>
                  <option value="BILL">Bills</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>
        {loading ? <p className="text-sm text-slate-500">Loading invoices...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-3 py-2 text-left">Invoice #</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invoice_id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">{row.invoice_number}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{shopMetaMap[String(row.shop_id)]?.shopName || row.shop_id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      UID: {shopMetaMap[String(row.shop_id)]?.userId || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.document_type ?? '—'}</td>
                  <td className="px-3 py-2">{row.amount}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-indigo-500 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-100 dark:hover:bg-indigo-500/25"
                        onClick={() => openPreview(row.invoice_id)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
                        onClick={() => navigate(`${detailPathBase}/${encodeURIComponent(String(row.invoice_id))}`)}
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No invoices found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {previewOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="invoice-preview-title">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/60"
              aria-label="Close preview"
              onClick={closePreview}
            />
            <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900">
              <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <div>
                  <h2 id="invoice-preview-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {previewInvoice?.invoice_number ? `Preview — ${previewInvoice.invoice_number}` : 'Invoice preview'}
                  </h2>
                  {previewMeta.shopName ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{previewMeta.shopName}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={previewLoading || !previewInvoice || previewDownloadingPdf}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:border-slate-500 dark:bg-slate-700"
                    onClick={downloadPreviewPdf}
                  >
                    {previewDownloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    onClick={closePreview}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 dark:bg-slate-950/80">
                {previewLoading ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading preview…</p> : null}
                {previewError ? <p className="text-sm text-red-600 dark:text-red-300">{previewError}</p> : null}
                {!previewLoading && previewInvoice ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700">
                    <SubscriptionInvoiceDocument
                      ref={previewPdfRef}
                      invoice={previewInvoice}
                      shop={{
                        shop_name: previewShopDetail?.shop_owner?.shop_name ?? previewMeta.shopName,
                        user_id:
                          previewShopDetail?.shop_owner?.user_id != null
                            ? String(previewShopDetail.shop_owner.user_id)
                            : previewMeta.userId !== '—'
                              ? previewMeta.userId
                              : undefined,
                        email: previewShopDetail?.shop_owner?.email ?? undefined,
                        phone: previewShopDetail?.shop_owner?.phone ?? previewMeta.phone ?? undefined,
                      }}
                      subscription={{ subscription_id: previewInvoice.subscription_id }}
                      address={previewShopDetail?.address ?? undefined}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex-shrink-0 border-t border-slate-200 px-4 py-2 text-center dark:border-slate-700">
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                  onClick={() => {
                    const id = previewInvoice?.invoice_id
                    closePreview()
                    if (id) navigate(`${detailPathBase}/${encodeURIComponent(String(id))}`)
                  }}
                >
                  Open full page (status, notes, email…)
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default InvoicesListPage

