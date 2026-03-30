import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import { useTheme } from '@/context/useTheme'

function SettingsPage({
  brandTitle = 'Teamify',
  pageTitle = 'Settings',
  activeKey = 'settings.main',
  dashboardPath = '/dashboard/teamify',
  contactBookPath = '/dashboard/teamify/contact-book',
  shopsPagePath = '/dashboard/teamify/shops',
  reportsPath = '/dashboard/teamify/reports',
  isPortal = false,
}) {
  const navigate = useNavigate()
  const accessToken = useSelector((state) => state.auth.session.accessToken)
  const { themeMode, setThemeMode } = useTheme()
  const [lightWarning, setLightWarning] = useState('')
  const [showLightWarningModal, setShowLightWarningModal] = useState(false)

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey,
        paths: {
          dashboardPath,
          homeContactBookPath: contactBookPath,
          shopsPath: shopsPagePath,
          createShopPath: `${shopsPagePath}/create`,
          deliveryPartnersPath: isPortal ? null : '/dashboard/teamify/delivery-partners',
          reportsPath: isPortal ? null : reportsPath,
          accountsInvoicesPath: isPortal ? '/portal/dashboard/accounts/invoices' : '/dashboard/teamify/accounts/invoices',
          accountsOverviewPath: isPortal ? '/portal/dashboard/accounts/overview' : '/dashboard/teamify/accounts/overview',
          activityDailyPath: isPortal ? null : '/dashboard/teamify/activity/daily',
          activitySalesPath: isPortal ? null : '/dashboard/teamify/activity/sales',
          settingsPath: isPortal ? '/portal/dashboard/settings' : '/dashboard/teamify/settings',
        },
      }),
    [activeKey, contactBookPath, dashboardPath, isPortal, navigate, reportsPath, shopsPagePath],
  )

  const handleThemeSwitch = (targetMode) => {
    if (targetMode === themeMode) return
    if (targetMode === 'light') {
      setShowLightWarningModal(true)
      return
    } else {
      setLightWarning('')
    }
    setThemeMode(targetMode)
  }

  const confirmLightMode = () => {
    setShowLightWarningModal(false)
    setLightWarning('Light mode is under development — some UI may have issues.')
    setThemeMode('light')
  }

  return (
    <DashboardLayout>
      <AppSidebar brandTitle={brandTitle} subTitle={pageTitle} navSections={navSections} themeMode={themeMode} />

      {showLightWarningModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setShowLightWarningModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Light mode is under development
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Some UI may look incorrect or have issues. Do you want to continue?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLightWarningModal(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLightWarningModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/55"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLightMode}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="min-h-0 flex-1 rounded-3xl bg-white p-1 dark:bg-slate-950/40 sm:p-2">
        <header className="teamify-surface mb-3 rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4 md:mb-4 md:p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-black dark:text-slate-100 sm:text-2xl md:text-3xl">
                {pageTitle}
              </h2>
              <p className="mt-1 text-sm text-black dark:text-slate-300">
                General settings.
              </p>
            </div>
            {accessToken ? (
              <button
                type="button"
                onClick={() => navigate(isPortal ? '/portal/dashboard' : '/dashboard/teamify')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/55"
              >
                Back to dashboard
              </button>
            ) : null}
          </div>
        </header>

        {lightWarning ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
            {lightWarning}
          </div>
        ) : null}

        <section className="teamify-surface rounded-3xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4 md:p-5">
          <h3 className="text-lg font-semibold text-black dark:text-slate-100">General settings</h3>
          <p className="mt-1 text-sm text-black dark:text-slate-300">
            Theme mode
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Appearance</div>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-800">
              <button
                type="button"
                onClick={() => handleThemeSwitch('dark')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  themeMode === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-800/70'
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => handleThemeSwitch('light')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  themeMode === 'light'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-800/70'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Light mode is under development.
          </p>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default SettingsPage

