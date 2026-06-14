import { AuthenticatedApp } from '@/app/AuthenticatedApp'
import { useAuth } from '@/hooks/useAuth'
import { ItmoIdLoginScreen } from '@/pages/ItmoIdLoginScreen'
import { SplashScreen } from '@/pages/SplashScreen'

/**
 * Маршрутизация по состоянию авторизации/профиля (Mini App — без URL-роутера):
 *   loading/error → Splash
 *   needs-login    → вход через ITMO ID (логин+пароль; аккаунт = логин)
 *   профиль готов  → главный экран
 */
export function AppFlow() {
  const { state, retry } = useAuth()

  if (state.status === 'loading') {
    return <SplashScreen />
  }
  if (state.status === 'error') {
    return <SplashScreen error={state.message} onRetry={retry} />
  }
  if (state.status === 'needs-login') {
    return <ItmoIdLoginScreen />
  }

  const { user } = state
  if (!user.itmo_id_linked) {
    // Аккаунт без привязанного ITMO ID (напр., старый) — просим войти заново.
    return <ItmoIdLoginScreen />
  }
  return <AuthenticatedApp user={user} />
}
