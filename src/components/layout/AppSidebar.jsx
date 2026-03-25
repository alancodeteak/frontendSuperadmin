import { useCallback, useEffect, useMemo, useState } from 'react'

function ChevronIcon({ open, className = '' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''} ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 0 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function DefaultIcon({ name, className = '' }) {
  const common = `h-4 w-4 ${className}`
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M5 7h14M5 12h14M5 17h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M5 19V5m0 14h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 15l3-3 3 2 5-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'task':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M7 7h10M7 12h10M7 17h10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5 7h.01M5 12h.01M5 17h.01"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'store':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M4 9V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M4 9h16l-1 11a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9L4 9Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9 12v7m6-7v7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )
  }
}

function AppSidebar({
  brandTitle,
  subTitle,
  navItems,
  navSections,
  themeMode,
  onToggleTheme,
  onLogout,
  isLoggingOut,
}) {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())
  const isDark = themeMode === 'dark'
  const [openGroups, setOpenGroups] = useState({})

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

  const effectiveSections = useMemo(() => {
    if (navSections?.length) return navSections
    if (!navItems?.length) return []
    return [
      {
        id: 'menu',
        title: 'Menu',
        items: navItems,
      },
    ]
  }, [navItems, navSections])

  const isItemActive = useCallback((item) => {
    if (item?.active) return true
    if (item?.children?.length) return item.children.some((c) => isItemActive(c))
    return false
  }, [])

  useEffect(() => {
    const next = {}
    for (const section of effectiveSections) {
      for (const item of section.items ?? []) {
        if (item?.children?.length) {
          next[item.id] = openGroups[item.id] ?? isItemActive(item)
        }
      }
    }
    setOpenGroups((prev) => ({ ...next, ...prev }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSections])

  const rowBase =
    'w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition duration-200'
  const rowInactive = isDark
    ? 'text-slate-300 hover:bg-slate-800'
    : 'text-black hover:bg-slate-100'
  const rowActive = 'bg-indigo-600 text-white shadow'

  const iconWrapClass = isDark
    ? 'grid h-8 w-8 place-items-center rounded-xl bg-slate-800 text-slate-200'
    : 'grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700'

  return (
    <aside className="teamify-side-panel teamify-surface mb-3 flex w-full flex-col rounded-3xl p-3 ring-1 ring-slate-200 transition duration-300 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 lg:mb-0 lg:h-[calc(100vh-2.5rem)] lg:w-[260px] lg:p-5 lg:sticky lg:top-5">
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

      <div
        className={`mb-5 rounded-xl px-3 py-2 text-xs ring-1 ${
          isDark
            ? 'bg-slate-800/70 text-slate-100 ring-slate-700'
            : 'bg-white text-black ring-slate-200'
        }`}
      >
        <p className="font-semibold">{formattedDate}</p>
        <p>{formattedTime}</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {effectiveSections.map((section) => (
            <div key={section.id} className="space-y-2">
              {section.title ? (
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                  {section.title}
                </p>
              ) : null}
              <div className="space-y-2">
                {(section.items ?? []).map((item) => {
                  const hasChildren = !!item.children?.length
                  const active = isItemActive(item)
                  const open = !!openGroups[item.id]

                  if (hasChildren) {
                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((p) => ({ ...p, [item.id]: !p[item.id] }))
                          }
                          className={`${rowBase} ${active ? rowActive : rowInactive}`}
                          aria-expanded={open}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={iconWrapClass}>
                                {item.icon ? (
                                  item.icon
                                ) : (
                                  <DefaultIcon name={item.iconName} className="h-4 w-4" />
                                )}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>
                            <ChevronIcon open={open} className={active ? 'text-white' : ''} />
                          </div>
                        </button>
                        {open ? (
                          <div className="space-y-1 pl-11">
                            {item.children.map((child) => {
                              const childActive = isItemActive(child)
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={child.onClick}
                                  className={`${rowBase} ${
                                    childActive ? rowActive : rowInactive
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                                    <span className="truncate">{child.label}</span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      className={`${rowBase} ${active ? rowActive : rowInactive}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={iconWrapClass}>
                          {item.icon ? (
                            item.icon
                          ) : (
                            <DefaultIcon name={item.iconName} className="h-4 w-4" />
                          )}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
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
