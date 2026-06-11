import { useAuth } from '@/hooks/useAuth'
import { ItmoIdLoginScreen } from '@/pages/ItmoIdLoginScreen'
import { PassengerHomeScreen } from '@/pages/PassengerHomeScreen'
import { RegistrationScreen } from '@/pages/RegistrationScreen'
import { SplashScreen } from '@/pages/SplashScreen'

/**
 * Маршрутизация по состоянию авторизации/профиля (Mini App — без URL-роутера):
 *   loading/error → Splash
 *   нет ИСУ        → регистрация (6.2)
 *   ИСУ есть, ITMO ID не привязан → вход ITMO ID
 *   профиль готов  → главный экран пассажира
 */
export function AppFlow() {
  const { state, retry } = useAuth()

  if (state.status === 'loading') {
    return <SplashScreen />
  }
  if (state.status === 'error') {
    return <SplashScreen error={state.message} onRetry={retry} />
  }

  const { user } = state
  if (!user.isu_number) {
    return <RegistrationScreen />
  }
  if (!user.itmo_id_linked) {
    return <ItmoIdLoginScreen />
  }
  return <PassengerHomeScreen user={user} />
}
