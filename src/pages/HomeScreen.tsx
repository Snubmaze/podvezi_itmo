import { useState } from 'react'

import { AppScreen } from '@/components/AppScreen'
import { Avatar } from '@/components/Avatar'
import { DriverVerificationModal } from '@/components/DriverVerificationModal'
import { RoleSwitcher, type ActiveRole } from '@/components/RoleSwitcher'
import type { User } from '@/types/db'

/** Имя из ФИО (формат «Фамилия Имя Отчество» → Имя). */
function givenName(fullName: string | null): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  return parts[1] ?? parts[0] ?? 'студент'
}

export function HomeScreen({
  user,
  onOpenProfile,
}: {
  user: User
  onOpenProfile: () => void
}) {
  const canDrive = user.driver_verification_status === 'approved'
  const [activeRole, setActiveRole] = useState<ActiveRole>('passenger')
  const [modalOpen, setModalOpen] = useState(false)

  const handleDriverClick = () => {
    if (canDrive) setActiveRole('driver')
    else setModalOpen(true)
  }

  return (
    <AppScreen>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Привет,</p>
          <p className="truncate text-lg font-semibold text-foreground">
            {givenName(user.full_name)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Открыть профиль"
          className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar url={user.avatar_url} name={user.full_name} className="size-11" />
        </button>
      </header>

      <div className="mt-5">
        <RoleSwitcher
          active={activeRole}
          canDrive={canDrive}
          onSelectPassenger={() => setActiveRole('passenger')}
          onDriverClick={handleDriverClick}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        {activeRole === 'passenger' ? (
          <>
            <h2 className="text-base font-semibold text-foreground">
              Поиск поездок
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Здесь появятся доступные поездки между корпусами и общежитиями.
              Поиск и заявки — на следующем шаге.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-foreground">
              Мои поездки
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Создание и управление поездками появятся на следующем шаге.
            </p>
          </>
        )}
      </div>

      <DriverVerificationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        status={user.driver_verification_status}
      />
    </AppScreen>
  )
}
