import type { TripStatus } from '@/types/db'

type BadgeVariant = 'neutral' | 'warning' | 'success' | 'danger'

/** Лейбл и вариант бейджа для статуса поездки (`trips.status`). */
export function tripStatusBadge(status: TripStatus): {
  label: string
  variant: BadgeVariant
} {
  switch (status) {
    case 'active':
      return { label: 'Активна', variant: 'success' }
    case 'in_progress':
      return { label: 'В пути', variant: 'warning' }
    case 'completed':
      return { label: 'Завершена', variant: 'neutral' }
    case 'cancelled':
      return { label: 'Отменена', variant: 'danger' }
  }
}
