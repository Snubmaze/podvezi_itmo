import { useContext } from 'react'

import { ThemeContext, type ThemeContextValue } from '@/app/theme-context'

/** Доступ к активной теме и переключателю. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within <ThemeProvider>')
  }
  return context
}
