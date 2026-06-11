import type { TripRequestStatus } from '@/types/db'

type BadgeVariant = 'neutral' | 'warning' | 'success' | 'danger'

/** Лейбл и вариант бейджа для статуса заявки на участие (`trip_requests.status`). */
export function tripRequestStatusBadge(status: TripRequestStatus): {
  label: string
  variant: BadgeVariant
} {
  switch (status) {
    case 'pending':
      return { label: 'На рассмотрении', variant: 'warning' }
    case 'accepted':
      return { label: 'Принята', variant: 'success' }
    case 'rejected':
      return { label: 'Отклонена', variant: 'danger' }
    case 'cancelled':
      return { label: 'Отменена', variant: 'neutral' }
  }
}
