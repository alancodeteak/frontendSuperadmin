import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'
import '@/App.css'

const mockShops = [
  {
    id: 'SHP-1001',
    name: 'Green Basket Mart',
    phoneNumber: '+91 98765 43210',
    address: '12 Lake View Road, Coimbatore, Tamil Nadu',
    photo:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'SHP-1002',
    name: 'Sunrise Grocery',
    phoneNumber: '+91 99440 11223',
    address: '45 Market Street, Peelamedu, Coimbatore',
    photo:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'SHP-1003',
    name: 'Urban Fresh Store',
    phoneNumber: '+91 90031 44556',
    address: '88 Cross Cut Road, Gandhipuram, Coimbatore',
    photo:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'SHP-1004',
    name: 'Daily Needs Point',
    phoneNumber: '+91 98400 77889',
    address: '22 Avinashi Road, Hope College, Coimbatore',
    photo:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=480&q=80',
  },
]

function ShopListingPage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  pageTitle = 'Shop Listing',
  caption = 'Manage and review registered shops',
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createPath = '/dashboard/teamify/shops/create',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'
  const [copyToast, setCopyToast] = useState(null)
  const copyToastTimerRef = useRef(null)

  const showCopyToast = useCallback((message) => {
    if (copyToastTimerRef.current) {
      clearTimeout(copyToastTimerRef.current)
    }
    setCopyToast(message)
    copyToastTimerRef.current = setTimeout(() => {
      setCopyToast(null)
      copyToastTimerRef.current = null
    }, 2200)
  }, [])

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current)
      }
    }
  }, [])

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const navSections = [
    {
      id: 'tabs',
      title: null,
      items: [
        {
          id: 'overview',
          label: 'Overview',
          active: false,
          onClick: () => navigate(dashboardPath),
        },
        {
          id: 'tasks',
          label: 'Tasks',
          active: false,
          onClick: () => navigate(dashboardPath),
        },
        {
          id: 'analytics',
          label: 'Analytics',
          active: false,
          onClick: () => navigate(dashboardPath),
        },
      ],
    },
    {
      id: 'shops',
      title: 'Shops',
      items: [
        {
          id: 'view',
          label: 'View Shops',
          active: true,
          onClick: () => navigate(shopsPath),
        },
        {
          id: 'create',
          label: 'Create Shop',
          active: false,
          onClick: () => navigate(createPath),
        },
      ],
    },
  ]

  const handleCopy = async (value, label) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      showCopyToast(label)
    } catch {
      showCopyToast('Could not copy — try again')
    }
  }

  const isDark = themeMode === 'dark'

  const copyIconClass = isDark
    ? 'h-3 w-3 object-contain invert opacity-100'
    : 'h-3 w-3 object-contain opacity-100'

  const copyButtonClass = isDark
    ? 'rounded-md border border-slate-700 bg-transparent p-1 transition-all duration-150 ease-out hover:bg-slate-800 hover:scale-[1.08] active:scale-[0.95]'
    : 'rounded-md border border-white/90 bg-slate-50/90 p-1 transition-all duration-150 ease-out hover:bg-slate-100 hover:scale-[1.08] active:scale-[0.95]'

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
      <main className="relative flex-1 rounded-3xl bg-white p-1 dark:bg-slate-950/40 sm:p-2">
        {copyToast && (
          <div
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,360px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-black shadow-lg ring-1 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
            role="status"
            aria-live="polite"
          >
            {copyToast}
          </div>
        )}
        <header className="teamify-surface mb-3 rounded-3xl p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 md:mb-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
            {brandTitle}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-black dark:text-slate-100 md:text-3xl">
            {pageTitle}
          </h2>
          <p className="mt-1 text-sm text-black dark:text-slate-300">{caption}</p>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockShops.map((shop) => (
            <article
              key={shop.id}
              className="shop-flip-card group relative rounded-3xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="shop-flip-inner">
                <div className="shop-flip-front teamify-surface ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <img
                    src={shop.photo}
                    alt={shop.name}
                    className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  <div className="space-y-1.5 p-3">
                    <h3 className="text-base font-semibold text-black dark:text-slate-100">
                      {shop.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[14px] leading-5 font-medium text-black dark:text-slate-300">
                      <p className="truncate">
                        User ID:{' '}
                        <span className="tabular-nums">{shop.id}</span>
                      </p>
                      <button
                        type="button"
                        aria-label={`Copy user id for ${shop.name}`}
                        title="Copy User ID"
                        onClick={() =>
                          handleCopy(shop.id, `User ID copied: ${shop.id}`)
                        }
                        className={copyButtonClass}
                      >
                        <img
                          src="/icons/copy.png"
                          alt=""
                          aria-hidden="true"
                          className={copyIconClass}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] leading-5 font-medium text-black dark:text-slate-300">
                      <p className="truncate">
                        Phone:{' '}
                        <span className="tabular-nums">{shop.phoneNumber}</span>
                      </p>
                      <button
                        type="button"
                        aria-label={`Copy phone number for ${shop.name}`}
                        title="Copy Phone Number"
                        onClick={() =>
                          handleCopy(
                            shop.phoneNumber,
                            `Phone number copied: ${shop.phoneNumber}`,
                          )
                        }
                        className={copyButtonClass}
                      >
                        <img
                          src="/icons/copy.png"
                          alt=""
                          aria-hidden="true"
                          className={copyIconClass}
                        />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="shop-flip-back teamify-surface flex flex-col justify-center p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">
                    Address
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-black dark:text-slate-100">
                    {shop.name}
                  </h4>
                  <p className="mt-2 text-sm leading-5 text-black dark:text-slate-300">
                    {shop.address}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ShopListingPage
