import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { authBackend } from '@/services/auth'
import { fetchItmoIdProfile } from '@/services/itmoId'
import type { User } from '@/types/db'

import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  // Проверяет текущую сессию; setState только в async-колбэках (не синхронно),
  // чтобы не вызывать каскадные рендеры из эффекта.
  const runAuth = useCallback((token: { cancelled: boolean }) => {
    authBackend
      .authenticate()
      .then((user) => {
        if (token.cancelled) return
        setState(user ? { status: 'ready', user } : { status: 'needs-login' })
      })
      .catch((error: unknown) => {
        if (token.cancelled) return
        const message =
          error instanceof Error ? error.message : 'Не удалось авторизоваться'
        setState({ status: 'error', message })
      })
  }, [])

  useEffect(() => {
    const token = { cancelled: false }
    runAuth(token)
    return () => {
      token.cancelled = true
    }
  }, [runAuth])

  // Повторная проверка из обработчика события (Splash → «Повторить»).
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    runAuth({ cancelled: false })
  }, [runAuth])

  // Вход через ITMO ID: мок-профиль по логину + создание/открытие аккаунта.
  const loginWithItmoId = useCallback(async (login: string, password: string) => {
    const profile = await fetchItmoIdProfile(login, password)
    const user = await authBackend.loginWithItmoId(login.trim(), profile)
    setState({ status: 'ready', user })
  }, [])

  const applyPatch = useCallback(async (patch: Partial<User>) => {
    const updated = await authBackend.updateProfile(patch)
    setState({ status: 'ready', user: updated })
  }, [])

  const updateDescription = useCallback(
    (description: string) => applyPatch({ description }),
    [applyPatch],
  )

  // Перечитать профиль без флага loading (после изменений вне updateProfile).
  const reloadUser = useCallback(async () => {
    const user = await authBackend.authenticate()
    setState(user ? { status: 'ready', user } : { status: 'needs-login' })
  }, [])

  // Выход: завершить сессию (данные аккаунта сохраняются) → вход ITMO ID.
  const logout = useCallback(async () => {
    await authBackend.logout()
    setState({ status: 'needs-login' })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        state,
        retry,
        loginWithItmoId,
        updateDescription,
        reloadUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
