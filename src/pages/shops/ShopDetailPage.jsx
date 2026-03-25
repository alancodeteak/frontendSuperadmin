import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import {
  selectSupermarketDetail,
  selectSupermarketDetailError,
  selectSupermarketDetailStatus,
} from '@/redux/slices/supermarketsSlice'
import { fetchSupermarketDetailAction } from '@/redux/thunks/supermarketsThunks'
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

  const detail = useSelector(selectSupermarketDetail)
  const detailStatus = useSelector(selectSupermarketDetailStatus)
  const detailError = useSelector(selectSupermarketDetailError)
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'

  useEffect(() => {
    if (!userId) return
    dispatch(fetchSupermarketDetailAction({ user_id: userId }))
  }, [dispatch, userId])

  const navSections = useMemo(
    () => [
      {
        id: 'profile',
        title: 'Profile',
        items: [
          { id: 'home', label: 'Home', iconName: 'home', active: false, onClick: () => navigate(dashboardPath) },
          {
            id: 'dashboard',
            label: 'Dashboard',
            iconName: 'menu',
            children: [
              { id: 'overview', label: 'Overview', active: false, onClick: () => navigate(dashboardPath) },
              { id: 'tasks', label: 'Tasks', active: false, onClick: () => navigate(dashboardPath) },
              { id: 'analytics', label: 'Analytics', active: false, onClick: () => navigate(dashboardPath) },
            ],
          },
        ],
      },
      {
        id: 'shops',
        title: 'Shops',
        items: [
          { id: 'view', label: 'View Shops', iconName: 'store', active: true, onClick: () => navigate(shopsPath) },
          { id: 'create', label: 'Create Shop', iconName: 'plus', active: false, onClick: () => navigate(createPath) },
        ],
      },
    ],
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

          {detailStatus === 'succeeded' && detail ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>Shop Owner</p>
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

