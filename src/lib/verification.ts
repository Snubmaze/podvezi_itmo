import type { DriverVerificationStatus, User } from '@/types/db'

type BadgeVariant = 'neutral' | 'primary' | 'warning' | 'success' | 'danger'

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

/**
 * Лейбл роли пользователя для профиля: Админ / Водитель / В процессе
 * верификации / Пассажир. Учитывает роль и статус верификации водителя.
 */
export function profileRoleBadge(
  user: Pick<User, 'role' | 'driver_verification_status'>,
): { label: string; variant: BadgeVariant } {
  if (user.role === 'admin') {
    return { label: 'Админ', variant: 'primary' }
  }
  switch (user.driver_verification_status) {
    case 'approved':
      return { label: 'Водитель', variant: 'success' }
    case 'pending':
      return { label: 'В процессе верификации', variant: 'warning' }
    default:
      return { label: 'Пассажир', variant: 'neutral' }
  }
}
