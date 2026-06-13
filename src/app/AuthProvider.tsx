import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { authBackend } from '@/services/auth'
import type { ItmoIdProfile } from '@/services/itmoId'
import type { User } from '@/types/db'

import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  // Запускает авторизацию; setState только в async-колбэках (не синхронно),
  // чтобы не вызывать каскадные рендеры из эффекта.
  const runAuth = useCallback((token: { cancelled: boolean }) => {
    authBackend
      .authenticate()
      .then((user) => {
        if (!token.cancelled) setState({ status: 'ready', user })
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

  // Повторная авторизация из обработчика события (Splash → «Повторить»).
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    runAuth({ cancelled: false })
  }, [runAuth])

  const applyPatch = useCallback(async (patch: Partial<User>) => {
    const updated = await authBackend.updateProfile(patch)
    setState({ status: 'ready', user: updated })
  }, [])

  const setIsuNumber = useCallback(
    (isuNumber: string) => applyPatch({ isu_number: isuNumber }),
    [applyPatch],
  )

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

  // Перечитать профиль без флажка loading (после изменений вне updateProfile,
  // напр. подачи заявки на верификацию через services/driver.ts).
  const reloadUser = useCallback(async () => {
    const user = await authBackend.authenticate()
    setState({ status: 'ready', user })
  }, [])

  // Выход = отвязка: сбрасываем привязку ИСУ + ITMO ID (статус водителя и роль
  // не трогаем — их меняет только админ) и заново запускаем онбординг.
  const logout = useCallback(async () => {
    try {
      await authBackend.updateProfile({
        isu_number: null,
        itmo_id_linked: false,
        full_name: null,
        course: null,
        age: null,
        avatar_url: null,
      })
    } catch {
      // даже если сброс полей не удался — всё равно завершаем сессию
    }
    await authBackend.signOut()
    setState({ status: 'loading' })
    runAuth({ cancelled: false })
  }, [runAuth])

  return (
    <AuthContext.Provider
      value={{
        state,
        retry,
        setIsuNumber,
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
