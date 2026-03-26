import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '@/context/themeContextObject'

const THEME_STORAGE_KEY = 'yaadro_theme_mode_v1'

function readInitialThemeMode() {
  if (typeof window === 'undefined') return 'light'

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore storage errors
  }

  return 'dark'
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => readInitialThemeMode())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', themeMode === 'dark')

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    } catch {
      // ignore storage errors
    }
  }, [themeMode])

  const value = useMemo(
    () => ({
      themeMode,
      isDark: themeMode === 'dark',
      setThemeMode,
      toggleTheme: () =>
        setThemeMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [themeMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
