import { init, isTMA, retrieveRawInitData } from '@telegram-apps/sdk-react'

/**
 * Initializes the Telegram Mini Apps SDK. No-op outside of Telegram
 * (e.g. when the app is opened directly in a browser during development).
 */
export function initTelegramSdk() {
  if (!isTMA()) {
    return
  }

  init()
}

/** Запущено ли приложение внутри Telegram Mini App. */
export function isTelegramEnv(): boolean {
  try {
    return isTMA()
  } catch {
    return false
  }
}

/**
 * Сырые initData из Telegram для проверки подписи на сервере
 * (Edge Function `telegram-auth`). null вне Telegram.
 */
export function getInitDataRaw(): string | null {
  try {
    return retrieveRawInitData() ?? null
  } catch {
    return null
  }
}
