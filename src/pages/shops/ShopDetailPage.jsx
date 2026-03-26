import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { presignUpload, putPresignedUpload } from '@/apis/uploadsApi'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import {
  selectSupermarketDetail,
  selectSupermarketDetailError,
  selectSupermarketDetailStatus,
} from '@/redux/slices/supermarketsSlice'
import {
  fetchSupermarketDetailAction,
  updateSupermarketAction,
} from '@/redux/thunks/supermarketsThunks'
import { useTheme } from '@/context/useTheme'
import { getRandomAvatarUrl } from '@/utils/avatarFallback'

function toDateMaybe(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const raw = String(value).trim()
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatReadableDateTime(value) {
  const d = toDateMaybe(value)
  if (!d) return 'null'

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startOfThatDay - startOfToday) / (24 * 60 * 60 * 1000))

  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)

  if (dayDiff === 0) return `Today ${time}`
  if (dayDiff === -1) return `Yesterday ${time}`

  const date = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(d)

  return `${date} ${time}`
}

function displayValue(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'string') return value.length ? value : 'null'
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : '[]'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function Field({ label, value, strongText, subtleText }) {
  return (
    <p className={strongText}>
      <span className={subtleText}>{label}:</span> {displayValue(value)}
    </p>
  )
}

function TimeField({ label, value, strongText, subtleText }) {
  return (
    <p className={strongText}>
      <span className={subtleText}>{label}:</span> {formatReadableDateTime(value)}
    </p>
  )
}

function ShopDetailPage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createPath = '/dashboard/teamify/shops/create',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { userId } = useParams()
  const { themeMode, toggleTheme } = useTheme()
  const isDark = themeMode === 'dark'
  const { session } = useSelector((state) => state.auth)
  const accessToken = session?.accessToken ?? null

  const detail = useSelector(selectSupermarketDetail)
  const detailStatus = useSelector(selectSupermarketDetailStatus)
  const detailError = useSelector(selectSupermarketDetailError)
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'

  const [uploading, setUploading] = useState({ photo: false, promotion: false })
  const [progress, setProgress] = useState({ photo: 0, promotion: 0 })
  const [uploadError, setUploadError] = useState('')
  const [uploadToast, setUploadToast] = useState('')
  const toastTimerRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    dispatch(fetchSupermarketDetailAction({ user_id: userId }))
  }, [dispatch, userId])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setUploadToast(message)
    toastTimerRef.current = setTimeout(() => {
      setUploadToast('')
      toastTimerRef.current = null
    }, 2200)
  }

  const validateImageFile = (file) => {
    if (!file) return 'No file selected'
    if (file.size > 10 * 1024 * 1024) return 'Image must be 10MB or smaller'
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) return 'Only PNG, JPEG, or WEBP images are allowed'
    return null
  }

  const uploadAndPatch = async ({ file, category }) => {
    const err = validateImageFile(file)
    if (err) {
      setUploadError(err)
      return
    }
    if (!accessToken) {
      setUploadError('Not authenticated. Please log in again.')
      return
    }
    if (!userId) return

    setUploadError('')
    setProgress((p) => ({ ...p, [category]: 0 }))
    setUploading((p) => ({ ...p, [category]: true }))

    try {
      const presign = await presignUpload(
        {
          purpose: 'shop_owner',
          filename: file.name,
          content_type: file.type,
          category,
        },
        { accessToken },
      )

      await putPresignedUpload({
        uploadUrl: presign.upload_url,
        file,
        contentType: file.type,
        onProgress: (pct) => setProgress((p) => ({ ...p, [category]: pct })),
      })

      const patch =
        category === 'photo'
          ? { photo: presign.key }
          : { promotion: { promotion_image_s3_key: presign.key } }

      await dispatch(updateSupermarketAction({ user_id: userId, patch })).unwrap()
      await dispatch(fetchSupermarketDetailAction({ user_id: userId }))
      showToast(category === 'photo' ? 'Photo updated' : 'Promotion image updated')
    } catch (e) {
      setUploadError(e?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading((p) => ({ ...p, [category]: false }))
    }
  }

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

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const surfaceClass = isDark
    ? 'rounded-3xl bg-slate-900 ring-1 ring-slate-700 shadow-[0_14px_32px_rgba(2,6,23,0.42)]'
    : 'rounded-3xl bg-white ring-1 ring-slate-200 shadow-[0_18px_36px_rgba(15,23,42,0.14)]'

  const subtleText = isDark ? 'text-slate-300' : 'text-slate-600'
  const strongText = isDark ? 'text-slate-100' : 'text-black'
  const sectionTitle = isDark ? 'text-indigo-300' : 'text-indigo-600'

  const shopOwner = detail?.shop_owner ?? null
  const address = detail?.address ?? null
  const subscription = detail?.subscription ?? null
  const promotion = detail?.promotion ?? null
  const timelineCandidate = detail?.timeline ?? null

  const isHttpUrl = (value) => /^https?:\/\//i.test(String(value ?? '').trim())
  const shopPhotoSrc =
    shopOwner?.photo_url ||
    (isHttpUrl(shopOwner?.photo) ? shopOwner.photo : null)
  const shopFallbackAvatar = useMemo(() => getRandomAvatarUrl(), [])
  const promoImageSrc =
    promotion?.promotion_image_url ||
    (isHttpUrl(promotion?.promotion_image_s3_key) ? promotion.promotion_image_s3_key : null)

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

      <main className="flex-1 bg-slate-50 dark:bg-slate-950">
        {uploadToast ? (
          <div
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,360px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-black shadow-lg ring-1 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
            role="status"
            aria-live="polite"
          >
            {uploadToast}
          </div>
        ) : null}
        <div className="p-1 sm:p-2">
          <div className={`${surfaceClass} overflow-hidden`}>
            <div className="relative h-56 w-full bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="absolute left-6 bottom-[-70px] flex items-end gap-5 md:left-10">
                <img
                  src={shopPhotoSrc || shopFallbackAvatar}
                  alt={`${shopOwner?.shop_name ?? 'Shop'} photo`}
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-900 md:h-36 md:w-36"
                  loading="lazy"
                />
                <div className="pb-4">
                  <h1 className="text-3xl font-semibold text-white">
                    {shopOwner?.shop_name ?? 'Shop Detail'}
                  </h1>
                  <p className="mt-1 text-sm text-white/90">
                    User ID: {userId ?? '—'} • Shop ID: {shopOwner?.shop_id ?? '—'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                      Status: {shopOwner?.status ?? '—'}
                    </span>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                      Payment: {shopOwner?.payment_status ?? '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(shopsPath)}
                      className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                    >
                      ← Back to Listing
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-24 max-w-[1500px] px-2 pb-2 sm:px-3 md:px-4 md:pb-4 lg:px-5 xl:px-6">
              <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Subscription</p>
                  <p className={`mt-1 text-sm font-semibold ${strongText}`}>
                    {subscription?.status ?? '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Amount</p>
                  <p className={`mt-1 text-sm font-semibold ${strongText}`}>
                    {subscription?.amount ?? '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Marketing</p>
                  <p className={`mt-1 text-sm font-semibold ${strongText}`}>
                    {promotion ? (promotion.is_marketing_enabled ? 'Yes' : 'No') : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Phone</p>
                  <p className={`mt-1 text-sm font-semibold ${strongText}`}>
                    {shopOwner?.phone ?? '—'}
                  </p>
                </div>
              </div>

              <section className={`${surfaceClass} p-4 md:p-5`}>
          {detailStatus === 'loading' ? (
            <p className={`text-sm font-semibold ${strongText}`}>Loading...</p>
          ) : null}

          {detailError ? (
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {detailError.message ?? 'Failed to load shop'}
            </p>
          ) : null}

          {uploadError ? (
            <p className="mb-3 text-sm font-semibold text-red-700 dark:text-red-300">{uploadError}</p>
          ) : null}

          {detailStatus === 'succeeded' && detail ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Shop Owner</p>
                <div className="mt-3 flex items-start gap-3">
                  <img
                    src={shopPhotoSrc || shopFallbackAvatar}
                    alt={`${shopOwner?.shop_name ?? 'Shop'} photo`}
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (file) uploadAndPatch({ file, category: 'photo' })
                          }}
                          disabled={uploading.photo || uploading.promotion}
                        />
                        <span
                          className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            isDark
                              ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800'
                              : 'border-slate-200 bg-white text-black hover:bg-slate-50'
                          } ${uploading.photo ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {uploading.photo ? `Uploading… ${progress.photo}%` : 'Upload Photo'}
                        </span>
                      </label>
                      <p className={`text-xs ${subtleText}`}>PNG/JPG/WEBP • Max 10MB</p>
                    </div>
                <div className="mt-3 space-y-1 text-sm">
                  <Field label="Shop" value={shopOwner?.shop_name} strongText={strongText} subtleText={subtleText} />
                  <Field label="Shop ID" value={shopOwner?.shop_id} strongText={strongText} subtleText={subtleText} />
                  <Field label="User ID" value={shopOwner?.user_id ?? detail?.user_id} strongText={strongText} subtleText={subtleText} />
                  <Field label="Phone" value={shopOwner?.phone} strongText={strongText} subtleText={subtleText} />
                  <Field label="Email" value={shopOwner?.email} strongText={strongText} subtleText={subtleText} />
                  <Field label="Status" value={shopOwner?.status} strongText={strongText} subtleText={subtleText} />
                  <Field label="Payment" value={shopOwner?.payment_status} strongText={strongText} subtleText={subtleText} />
                </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Address</p>
                <div className="mt-3 space-y-1 text-sm">
                  <Field label="Street" value={address?.street_address} strongText={strongText} subtleText={subtleText} />
                  <Field label="City" value={address?.city} strongText={strongText} subtleText={subtleText} />
                  <Field label="State" value={address?.state} strongText={strongText} subtleText={subtleText} />
                  <Field label="Pincode" value={address?.pincode} strongText={strongText} subtleText={subtleText} />
                  <Field label="Latitude" value={address?.latitude} strongText={strongText} subtleText={subtleText} />
                  <Field label="Longitude" value={address?.longitude} strongText={strongText} subtleText={subtleText} />
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Timeline</p>
                <div className="mt-3 space-y-1 text-sm">
                  <TimeField label="Created At" value={shopOwner?.created_at ?? detail?.created_at ?? timelineCandidate?.created_at} strongText={strongText} subtleText={subtleText} />
                  <TimeField label="Updated At" value={shopOwner?.updated_at ?? detail?.updated_at ?? timelineCandidate?.updated_at} strongText={strongText} subtleText={subtleText} />
                  <TimeField label="Approved At" value={shopOwner?.approved_at ?? detail?.approved_at ?? timelineCandidate?.approved_at} strongText={strongText} subtleText={subtleText} />
                  <TimeField label="Deleted At" value={shopOwner?.deleted_at ?? detail?.deleted_at ?? timelineCandidate?.deleted_at} strongText={strongText} subtleText={subtleText} />
                  <TimeField label="Last Login" value={shopOwner?.last_login_at ?? shopOwner?.last_login ?? detail?.last_login_at ?? detail?.last_login} strongText={strongText} subtleText={subtleText} />
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Subscription</p>
                <div className="mt-3 space-y-1 text-sm">
                  {subscription ? (
                    <>
                      <p className={strongText}>
                        <span className={subtleText}>Status:</span> {subscription.status ?? '—'}
                      </p>
                      <p className={strongText}>
                        <span className={subtleText}>Amount:</span> {subscription.amount ?? '—'}
                      </p>
                      <p className={strongText}>
                        <span className={subtleText}>Start:</span> {subscription.start_date ?? '—'}
                      </p>
                      <p className={strongText}>
                        <span className={subtleText}>End:</span> {subscription.end_date ?? '—'}
                      </p>
                    </>
                  ) : (
                    <p className={subtleText}>No subscription</p>
                  )}
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Promotion</p>
                <div className="mt-3 space-y-1 text-sm">
                  {promotion ? (
                    <>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              e.target.value = ''
                              if (file) uploadAndPatch({ file, category: 'promotion' })
                            }}
                            disabled={uploading.photo || uploading.promotion}
                          />
                          <span
                            className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              isDark
                                ? 'border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800'
                                : 'border-slate-200 bg-white text-black hover:bg-slate-50'
                            } ${uploading.promotion ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {uploading.promotion
                              ? `Uploading… ${progress.promotion}%`
                              : 'Upload Promotion Image'}
                          </span>
                        </label>
                        <p className={`text-xs ${subtleText}`}>PNG/JPG/WEBP • Max 10MB</p>
                      </div>
                      <div className="mb-2">
                        {promoImageSrc ? (
                          <img
                            src={promoImageSrc}
                            alt="Promotion"
                            className="h-20 w-full rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-20 w-full place-items-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                            No promotion image
                          </div>
                        )}
                      </div>
                      <p className={strongText}>
                        <span className={subtleText}>Enabled:</span> {promotion.is_marketing_enabled ? 'Yes' : 'No'}
                      </p>
                      <p className={strongText}>
                        <span className={subtleText}>Header:</span> {promotion.promotion_header ?? '—'}
                      </p>
                      <p className={strongText}>
                        <span className={subtleText}>Link:</span> {promotion.promotion_link ?? '—'}
                      </p>
                    </>
                  ) : (
                    <p className={subtleText}>No promotion</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {detailStatus === 'succeeded' && detail ? (
            <div className="mt-4">
              <details className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <summary className={`cursor-pointer text-sm font-semibold ${strongText}`}>
                  All fields (raw)
                </summary>
                <pre className={`mt-3 overflow-auto rounded-xl p-3 text-xs leading-5 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
                  {JSON.stringify(detail, null, 2) ?? 'null'}
                </pre>
              </details>
            </div>
          ) : null}
        </section>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default ShopDetailPage

