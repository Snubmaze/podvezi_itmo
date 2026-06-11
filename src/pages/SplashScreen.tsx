import { AppScreen } from '@/components/AppScreen'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/**
 * Экран начальной загрузки (ТЗ 6.1): логотип, название сервиса,
 * индикатор авторизации. При ошибке — сообщение и кнопка повтора.
 */
export function SplashScreen({
  error,
  onRetry,
}: {
  error?: string
  onRetry?: () => void
}) {
  return (
    <AppScreen className="items-center justify-center text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <BrandMark className="size-20 rounded-3xl" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Попутчик ИТМО</h1>
          <p className="text-sm text-muted-foreground">
            Совместные поездки между корпусами и общежитиями
          </p>
        </div>

        {error ? (
          <div className="mt-2 flex flex-col items-center gap-3">
            <p className="text-sm text-danger-foreground">{error}</p>
            {onRetry && (
              <Button variant="outline" size="lg" onClick={onRetry}>
                Повторить
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Авторизация…
          </div>
        )}
      </div>
    </AppScreen>
  )
}
