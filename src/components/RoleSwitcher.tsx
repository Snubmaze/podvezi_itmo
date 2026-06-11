import { Car, Lock, User } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ActiveRole = 'passenger' | 'driver'

/**
 * Переключатель активной роли на главном экране (локальный режим UI).
 * «Водитель» заблокирован (замок), пока статус верификации ≠ approved;
 * клик по заблокированному ведёт к модалке заявки (обрабатывает родитель).
 */
export function RoleSwitcher({
  active,
  canDrive,
  onSelectPassenger,
  onDriverClick,
}: {
  active: ActiveRole
  canDrive: boolean
  onSelectPassenger: () => void
  onDriverClick: () => void
}) {
  const tabBase =
    'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors'
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      <button
        type="button"
        onClick={onSelectPassenger}
        className={cn(
          tabBase,
          active === 'passenger'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <User className="size-4" />
        Пассажир
      </button>
      <button
        type="button"
        onClick={onDriverClick}
        aria-disabled={!canDrive}
        className={cn(
          tabBase,
          active === 'driver'
            ? 'bg-card text-foreground shadow-xs'
            : canDrive
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-tertiary',
        )}
      >
        {canDrive ? <Car className="size-4" /> : <Lock className="size-4" />}
        Водитель
      </button>
    </div>
  )
}
