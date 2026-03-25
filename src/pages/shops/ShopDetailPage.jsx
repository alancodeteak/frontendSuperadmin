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

  const isHttpUrl = (value) => /^https?:\/\//i.test(String(value ?? '').trim())
  const shopPhotoSrc =
    shopOwner?.photo_url ||
    (isHttpUrl(shopOwner?.photo) ? shopOwner.photo : null)
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

      <main className={isDark ? 'flex-1 rounded-3xl bg-slate-950/40 p-1 sm:p-2' : 'flex-1 rounded-3xl bg-white p-1 sm:p-2'}>
        {uploadToast ? (
          <div
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,360px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-black shadow-lg ring-1 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
            role="status"
            aria-live="polite"
          >
            {uploadToast}
          </div>
        ) : null}
        <header className={`${surfaceClass} mb-3 p-4 md:mb-4 md:p-5`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
            {brandTitle}
          </p>
          <h2 className={`mt-1 text-2xl font-semibold tracking-tight ${strongText} md:text-3xl`}>
            Shop Detail
          </h2>
          <p className={`mt-1 text-sm ${subtleText}`}>User ID: {userId}</p>
        </header>

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
                  {shopPhotoSrc ? (
                    <img
                      src={shopPhotoSrc}
                      alt={`${shopOwner?.shop_name ?? 'Shop'} photo`}
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      No photo
                    </div>
                  )}
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
                  <p className={strongText}>
                    <span className={subtleText}>Shop:</span> {shopOwner?.shop_name ?? '—'}
                  </p>
                  <p className={strongText}>
                    <span className={subtleText}>Shop ID:</span> {shopOwner?.shop_id ?? '—'}
                  </p>
                  <p className={strongText}>
                    <span className={subtleText}>Phone:</span> {shopOwner?.phone ?? '—'}
                  </p>
                  <p className={strongText}>
                    <span className={subtleText}>Email:</span> {shopOwner?.email ?? '—'}
                  </p>
                  <p className={strongText}>
                    <span className={subtleText}>Status:</span> {shopOwner?.status ?? '—'}
                  </p>
                  <p className={strongText}>
                    <span className={subtleText}>Payment:</span> {shopOwner?.payment_status ?? '—'}
                  </p>
                </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Address</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p className={strongText}>{address?.street_address ?? '—'}</p>
                  <p className={strongText}>
                    {address?.city ?? '—'}, {address?.state ?? '—'} - {address?.pincode ?? '—'}
                  </p>
                  <p className={strongText}>
                    <span className={subtleText}>Geo:</span> {address?.latitude ?? '—'}, {address?.longitude ?? '—'}
                  </p>
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
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ShopDetailPage

