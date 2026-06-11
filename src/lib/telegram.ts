import { init, isTMA } from '@telegram-apps/sdk-react'

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
