import { useEffect, useMemo, useRef, useState } from 'react'
import { getRandomAvatarUrl } from '@/utils/avatarFallback'

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
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a8.6 8.6 0 0 0 .1-1 8.6 8.6 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6H9.1l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a8.6 8.6 0 0 0-.1 1 8.6 8.6 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1c.53.4 1.1.75 1.7 1l.4 2.6h5.8l.4-2.6c.6-.25 1.17-.6 1.7-1l2.4 1 2-3.4-2-1.6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4.5 19.5c1.2-3.4 4-5.5 8.5-5.5s7.3 2.1 8.5 5.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M7 3h7l3 3v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14 3v4h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 11h7M8.5 14.5h7M8.5 18h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M20 11h-4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h4v-4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'activity':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
          <path
            d="M4 13h3l2-6 4 14 2-8h3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
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
  const profileAvatar = useMemo(() => getRandomAvatarUrl(), [])
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

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

  const activeCategoryId = useMemo(() => {
    for (const section of effectiveSections) {
      for (const category of section.items ?? []) {
        if (category?.children?.some((c) => c?.active)) return category.id
      }
    }
    return null
  }, [effectiveSections])

  const [openCategoryId, setOpenCategoryId] = useState(() => activeCategoryId ?? null)

  const showToast = (message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 1800)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const el = typeof document !== 'undefined' ? document.querySelector('.teamify-side-panel') : null
    if (!el) return
    const s = window.getComputedStyle(el)
    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f18df4'},body:JSON.stringify({sessionId:'f18df4',runId:'fade-fonts-1',hypothesisId:'H5',location:'AppSidebar.jsx:panelStyle',message:'Sidebar panel computed style',data:{themeMode,isDark,backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,filter:s.filter,opacity:s.opacity},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isDark, themeMode])

  const rowBase =
    'w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200'
  const rowInactive = isDark
    ? 'text-slate-300 hover:bg-slate-800'
    : 'text-black hover:bg-slate-100'
  const rowActive = 'bg-indigo-600 text-white shadow'
  const rowDisabled = isDark
    ? 'text-slate-500 opacity-70 cursor-not-allowed'
    : 'text-slate-400 opacity-75 cursor-not-allowed'

  const iconWrapClass = isDark
    ? 'grid h-8 w-8 place-items-center rounded-xl bg-slate-800 text-slate-200'
    : 'grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700'

  return (
    <aside className="teamify-side-panel teamify-surface mb-3 flex w-full flex-col rounded-3xl p-3 ring-1 ring-slate-200 transition duration-300 dark:ring-slate-700 sm:p-4 lg:mb-0 lg:h-[calc(100vh-2.5rem)] lg:w-[260px] lg:p-5 lg:sticky lg:top-5">
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[min(90vw,360px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-black shadow-lg ring-1 ring-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-3 lg:mb-8">
        <img
          src={profileAvatar}
          alt="Profile avatar"
          className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          loading="lazy"
        />
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
        <p className={isDark ? 'text-slate-200' : 'text-black'}>{formattedTime}</p>
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
                  const isOpen = openCategoryId === item.id
                  const hasChildren = !!item.children?.length
                  const isCategoryActive = item.children?.some((c) => c?.active)

                  return (
                    <div
                      key={item.id}
                      className="space-y-1"
                      onMouseEnter={() => setOpenCategoryId(item.id)}
                      onMouseLeave={() => setOpenCategoryId(null)}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCategoryId((prev) => (prev === item.id ? null : item.id))
                        }
                        className={`${rowBase} ${isCategoryActive ? rowActive : rowInactive}`}
                        aria-expanded={isOpen}
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
                            <span className="truncate font-semibold">
                              {String(item.label ?? '')}
                            </span>
                          </div>
                          <ChevronIcon open={isOpen} className={isCategoryActive ? 'text-white' : ''} />
                        </div>
                      </button>

                      <div
                        className={`pl-11 transition-all duration-1000 ease-out motion-reduce:transition-none ${
                          isOpen && hasChildren
                            ? 'max-h-96 opacity-100 translate-y-0'
                            : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
                        } overflow-hidden`}
                      >
                        <div className="relative space-y-1 pt-1">
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-1 top-2 left-2 w-px bg-current opacity-20"
                          />
                          {item.children.map((child) => {
                            const childActive = !!child.active
                            const disabled = !!child.disabled
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => {
                                  if (disabled) {
                                    showToast(child.disabledReason || 'Coming soon')
                                    return
                                  }
                                  child.onClick?.()
                                }}
                                disabled={disabled}
                                className={`${rowBase} ${
                                  disabled
                                    ? rowDisabled
                                    : childActive
                                      ? rowActive
                                      : rowInactive
                                }`}
                              >
                                <div className="relative flex min-w-0 items-center gap-3">
                                  <span aria-hidden="true" className="relative w-4 shrink-0">
                                    <span className="absolute left-2 top-1/2 h-px w-2 -translate-y-1/2 bg-current opacity-20" />
                                  </span>
                                  <span className="truncate">{child.label}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
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
          className="w-full rounded-xl border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition duration-300 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
