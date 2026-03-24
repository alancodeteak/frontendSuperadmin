import { useEffect, useState } from 'react'

function AppSidebar({
  brandTitle,
  subTitle,
  navItems,
  themeMode,
  onToggleTheme,
  onLogout,
  isLoggingOut,
}) {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = currentDateTime.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = currentDateTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <aside className="teamify-side-panel teamify-surface mb-3 flex w-full flex-col rounded-3xl p-3 ring-1 ring-slate-200 transition duration-300 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 lg:mb-0 lg:h-[calc(100vh-2.5rem)] lg:w-[240px] lg:p-5 lg:sticky lg:top-5">
      <div className="mb-6 flex items-center gap-3 lg:mb-8">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
          T
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-black dark:text-slate-100">
            {brandTitle}
          </h1>
          <p className="text-xs text-black dark:text-slate-300">{subTitle}</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl bg-white/70 px-3 py-2 text-xs text-black ring-1 ring-slate-300 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-700">
        <p className="font-semibold">{formattedDate}</p>
        <p>{formattedTime}</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`w-full rounded-xl px-4 py-2 text-left text-sm font-medium transition duration-300 ${
              item.active
                ? 'bg-indigo-600 text-white shadow'
                : 'text-black hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-black transition duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Switch to {themeMode === 'dark' ? 'Light' : 'Dark'} Mode
        </button>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition duration-300 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
