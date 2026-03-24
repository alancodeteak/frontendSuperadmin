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
    photo:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'SHP-1002',
    name: 'Sunrise Grocery',
    phoneNumber: '+91 99440 11223',
    photo:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'SHP-1003',
    name: 'Urban Fresh Store',
    phoneNumber: '+91 90031 44556',
    photo:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'SHP-1004',
    name: 'Daily Needs Point',
    phoneNumber: '+91 98400 77889',
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
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const sidebarNavItems = [
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
    {
      id: 'shops',
      label: 'Shop Listing',
      active: true,
      onClick: () => navigate(shopsPath),
    },
  ]

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle={sidebarSubTitle}
        navItems={sidebarNavItems}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <main className="flex-1 rounded-3xl bg-white p-1 dark:bg-slate-950/40 sm:p-2">
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
              className="teamify-surface overflow-hidden rounded-3xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <img
                src={shop.photo}
                alt={shop.name}
                className="h-36 w-full object-cover"
                loading="lazy"
              />
              <div className="space-y-1.5 p-3">
                <h3 className="text-base font-semibold text-black dark:text-slate-100">
                  {shop.name}
                </h3>
                <p className="text-sm text-black dark:text-slate-300">
                  <span className="font-medium">User ID:</span> {shop.id}
                </p>
                <p className="text-sm text-black dark:text-slate-300">
                  <span className="font-medium">Phone:</span> {shop.phoneNumber}
                </p>
              </div>
            </article>
          ))}
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ShopListingPage
