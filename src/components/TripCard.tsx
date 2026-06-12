import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

import { Avatar } from '@/components/Avatar'
import { formatTripDate, formatTripTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { TripWithRoute } from '@/types/trips'

/**
 * Презентационная карточка поездки: маршрут, дата/время, места, цена,
 * водитель (опционально). `badge` — статус поездки/заявки в шапке,
 * `footer` — действия (кнопки "Присоединиться"/"Отменить заявку" и т.п.).
 */
export function TripCard({
  trip,
  showDriver = false,
  onDriverClick,
  badge,
  footer,
  className,
}: {
  trip: TripWithRoute
  showDriver?: boolean
  /** Если задан — имя водителя кликабельно и открывает его профиль. */
  onDriverClick?: (driverId: string) => void
  badge?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate">{trip.origin.name}</span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{trip.destination.name}</span>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          {formatTripDate(trip.departure_time)}, {formatTripTime(trip.departure_time)}
        </span>
        <span>
          {trip.seats_available} из {trip.seats_total} мест
        </span>
        {trip.price != null && <span>{trip.price} ₽</span>}
      </div>

      {showDriver && trip.driver && (
        <div className="mt-2 flex items-center gap-2">
          <Avatar
            url={trip.driver.avatar_url}
            name={trip.driver.full_name}
            className="size-7 text-xs"
          />
          {onDriverClick ? (
            <button
              type="button"
              onClick={() => onDriverClick(trip.driver!.id)}
              className="rounded-sm text-sm text-foreground underline decoration-muted-foreground/50 underline-offset-2 outline-none hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {trip.driver.full_name ?? 'Студент ИТМО'}
            </button>
          ) : (
            <span className="text-sm text-foreground">
              {trip.driver.full_name ?? 'Студент ИТМО'}
            </span>
          )}
        </div>
      )}

      {trip.comment && <p className="mt-2 text-sm text-muted-foreground">{trip.comment}</p>}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}
