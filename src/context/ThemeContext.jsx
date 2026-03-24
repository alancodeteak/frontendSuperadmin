import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '@/context/themeContextObject'

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState('light')

  useEffect(() => {
    const root = document.documentElement
    if (themeMode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
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
