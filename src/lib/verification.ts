import type { DriverVerificationStatus } from '@/types/db'

type BadgeVariant = 'neutral' | 'warning' | 'success' | 'danger'

/** Лейбл и вариант бейджа для статуса верификации водителя. */
export function verificationBadge(status: DriverVerificationStatus): {
  label: string
  variant: BadgeVariant
} {
  switch (status) {
    case 'approved':
      return { label: 'Водитель подтверждён', variant: 'success' }
    case 'pending':
      return { label: 'Заявка на проверке', variant: 'warning' }
    case 'rejected':
      return { label: 'Заявка отклонена', variant: 'danger' }
    default:
      return { label: 'Не верифицирован', variant: 'neutral' }
  }
}
