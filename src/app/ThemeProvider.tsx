import { useCallback, useEffect, useState, type ReactNode } from 'react'

import {
  getSystemTheme,
  loadThemeOverride,
  saveThemeOverride,
  subscribeSystemTheme,
  type ThemeMode,
} from '@/lib/theme'

import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<ThemeMode | null>(() =>
    loadThemeOverride(),
  )
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(() => getSystemTheme())

  // Следим за системной темой, пока пользователь не выбрал вручную.
  useEffect(
    () => subscribeSystemTheme(() => setSystemTheme(getSystemTheme())),
    [],
  )

  const theme = override ?? systemTheme

  // Применяем класс `dark` к <html> (см. токены в src/index.css).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setOverride((prev) => {
      const current = prev ?? getSystemTheme()
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
      saveThemeOverride(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
