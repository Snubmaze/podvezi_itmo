import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { authBackend } from '@/services/auth'
import type { ItmoIdProfile } from '@/services/itmoId'
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
        setState(user ? { status: 'ready', user } : { status: 'needs-isu' })
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

  // Вход по ИСУ (экран ввода ИСУ).
  const loginWithIsu = useCallback(async (isu: string) => {
    const user = await authBackend.loginWithIsu(isu)
    setState({ status: 'ready', user })
  }, [])

  const applyPatch = useCallback(async (patch: Partial<User>) => {
    const updated = await authBackend.updateProfile(patch)
    setState({ status: 'ready', user: updated })
  }, [])

  const linkItmoId = useCallback(
    (profile: ItmoIdProfile) =>
      applyPatch({
        full_name: profile.full_name,
        course: profile.course,
        age: profile.age,
        avatar_url: profile.avatar_url,
        itmo_id_linked: true,
      }),
    [applyPatch],
  )

  const updateDescription = useCallback(
    (description: string) => applyPatch({ description }),
    [applyPatch],
  )

  // Перечитать профиль без флага loading (после изменений вне updateProfile).
  const reloadUser = useCallback(async () => {
    const user = await authBackend.authenticate()
    setState(user ? { status: 'ready', user } : { status: 'needs-isu' })
  }, [])

  // Выход: завершить сессию (данные аккаунта сохраняются) → ввод ИСУ.
  const logout = useCallback(async () => {
    await authBackend.logout()
    setState({ status: 'needs-isu' })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        state,
        retry,
        loginWithIsu,
        linkItmoId,
        updateDescription,
        reloadUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
