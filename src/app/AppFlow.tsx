import { AuthenticatedApp } from '@/app/AuthenticatedApp'
import { useAuth } from '@/hooks/useAuth'
import { ItmoIdLoginScreen } from '@/pages/ItmoIdLoginScreen'
import { RegistrationScreen } from '@/pages/RegistrationScreen'
import { SplashScreen } from '@/pages/SplashScreen'

/**
 * Маршрутизация по состоянию авторизации/профиля (Mini App — без URL-роутера):
 *   loading/error → Splash
 *   needs-isu      → вход по номеру ИСУ (аккаунт = ИСУ)
 *   ITMO ID не привязан → мок-вход ITMO ID
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
  if (state.status === 'needs-isu') {
    return <RegistrationScreen />
  }

  const { user } = state
  if (!user.itmo_id_linked) {
    return <ItmoIdLoginScreen />
  }
  return <AuthenticatedApp user={user} />
}
