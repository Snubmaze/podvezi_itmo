import { createContext } from 'react'

import type { ThemeMode } from '@/lib/theme'

export interface ThemeContextValue {
  /** Активная тема (с учётом ручного выбора и системной). */
  theme: ThemeMode
  /** Переключить тему вручную (light ↔ dark), выбор сохраняется. */
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
