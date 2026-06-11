import { AppScreen } from '@/components/AppScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types/db'

/**
 * Главный экран пассажира (заглушка). Профиль из ITMO ID отображается как
 * нередактируемые данные; список поездок появится на шаге 6.
 */
export function PassengerHomeScreen({ user }: { user: User }) {
  const { signOut } = useAuth()

  return (
    <AppScreen>
      <div className="flex items-center gap-3 pt-2">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="size-14 rounded-full border border-border bg-muted object-cover"
          />
        ) : (
          <div className="size-14 rounded-full bg-muted" />
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {user.full_name ?? 'Студент ИТМО'}
          </p>
          <p className="text-sm text-muted-foreground">
            {[user.course && `${user.course} курс`, user.age && `${user.age} лет`]
              .filter(Boolean)
              .join(' · ') || 'Пассажир'}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">
          Добро пожаловать!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Поиск и создание поездок появятся на следующем шаге. Сейчас доступен
          вход и профиль из ITMO ID.
        </p>
      </div>

      {import.meta.env.DEV && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-auto self-center text-muted-foreground"
          onClick={() => void signOut()}
        >
          Сбросить сессию (дев)
        </Button>
      )}
    </AppScreen>
  )
}
