/**
 * Определение и подписка на системную тему.
 * Приоритет: тема Telegram (`colorScheme`) → системная (`prefers-color-scheme`).
 * Ручной выбор пользователя хранится отдельно (см. ThemeProvider).
 */

export type ThemeMode = 'light' | 'dark'

const OVERRIDE_KEY = 'podvezi.theme'

interface TelegramWebApp {
  colorScheme?: ThemeMode
  onEvent?: (event: string, cb: () => void) => void
  offEvent?: (event: string, cb: () => void) => void
}

function telegramWebApp(): TelegramWebApp | null {
  try {
    return (
      (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
        ?.WebApp ?? null
    )
  } catch {
    return null
  }
}

/** Текущая системная тема (Telegram → ОС/браузер). */
export function getSystemTheme(): ThemeMode {
  const tg = telegramWebApp()
  if (tg?.colorScheme) return tg.colorScheme
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

/** Подписка на смену системной темы (ОС и Telegram). Возвращает отписку. */
export function subscribeSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', onChange)
  const tg = telegramWebApp()
  tg?.onEvent?.('themeChanged', onChange)
  return () => {
    mq.removeEventListener('change', onChange)
    tg?.offEvent?.('themeChanged', onChange)
  }
}

/** Сохранённый ручной выбор темы (или null — следовать системной). */
export function loadThemeOverride(): ThemeMode | null {
  try {
    const value = localStorage.getItem(OVERRIDE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function saveThemeOverride(mode: ThemeMode): void {
  try {
    localStorage.setItem(OVERRIDE_KEY, mode)
  } catch {
    // localStorage недоступен — игнорируем
  }
}
