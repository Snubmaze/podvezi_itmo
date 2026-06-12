import { useState } from 'react'

import { AppScreen } from '@/components/AppScreen'
import { Avatar } from '@/components/Avatar'
import { DriverVerificationModal } from '@/components/DriverVerificationModal'
import { RoleSwitcher, type ActiveRole } from '@/components/RoleSwitcher'
import { RouteSelector } from '@/components/RouteSelector'
import { TripCard } from '@/components/TripCard'
import { TripSearchFilterBar } from '@/components/TripSearchFilterBar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useLocations } from '@/hooks/useLocations'
import { useTripSearch } from '@/hooks/useTripSearch'
import { joinTrip } from '@/services/trips'
import type { User } from '@/types/db'
import type { TripWithRoute } from '@/types/trips'

/** Имя из ФИО (формат «Фамилия Имя Отчество» → Имя). */
function givenName(fullName: string | null): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  return parts[1] ?? parts[0] ?? 'студент'
}

/** Карточка найденной поездки с кнопкой подачи заявки (ТЗ 5.7, экран 6.8). */
function TripSearchResultCard({
  user,
  trip,
  onJoined,
  onOpenDriverProfile,
}: {
  user: User
  trip: TripWithRoute
  onJoined: () => void
  onOpenDriverProfile: (userId: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  )
  const noSeats = trip.seats_available <= 0

  const handleJoin = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      await joinTrip(user.id, trip.id)
      setMessage({ type: 'success', text: 'Заявка отправлена водителю' })
      onJoined()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось подать заявку',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TripCard
      trip={trip}
      showDriver
      onDriverClick={onOpenDriverProfile}
      footer={
        <div className="space-y-1.5">
          <Button
            size="sm"
            className="w-full"
            onClick={handleJoin}
            disabled={submitting || noSeats || message?.type === 'success'}
          >
            {submitting && <Spinner className="size-4 text-primary-foreground" />}
            {noSeats ? 'Мест нет' : 'Присоединиться'}
          </Button>
          {message && (
            <p
              className={
                message.type === 'error'
                  ? 'text-sm text-danger-foreground'
                  : 'text-sm text-success-foreground'
              }
            >
              {message.text}
            </p>
          )}
        </div>
      }
    />
  )
}

/** Поиск поездок с фильтрами и список результатов (ТЗ 5.7, экран 6.8). */
function PassengerTripSearch({
  user,
  originId,
  destinationId,
  onOpenDriverProfile,
}: {
  user: User
  originId: string | null
  destinationId: string | null
  onOpenDriverProfile: (userId: string) => void
}) {
  const [date, setDate] = useState<string | null>(null)
  const [timeFrom, setTimeFrom] = useState<string | null>(null)
  const { trips, loading, error, refetch } = useTripSearch(
    { originId, destinationId, date, timeFrom },
    user.id,
  )

  return (
    <div className="mt-4 space-y-3">
      <TripSearchFilterBar
        date={date}
        timeFrom={timeFrom}
        onChangeDate={setDate}
        onChangeTimeFrom={setTimeFrom}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Загрузка поездок…
        </div>
      ) : error ? (
        <p className="text-sm text-danger-foreground">{error}</p>
      ) : trips.length === 0 ? (
        <p className="text-sm text-muted-foreground">Поездок по вашему маршруту пока нет</p>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripSearchResultCard
              key={trip.id}
              user={user}
              trip={trip}
              onJoined={refetch}
              onOpenDriverProfile={onOpenDriverProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function HomeScreen({
  user,
  activeRole,
  onChangeActiveRole,
  onOpenProfile,
  onCreateTrip,
  onMyTrips,
  onVerifyDriver,
  onOpenDriverProfile,
}: {
  user: User
  activeRole: ActiveRole
  onChangeActiveRole: (role: ActiveRole) => void
  onOpenProfile: () => void
  onCreateTrip: () => void
  onMyTrips: () => void
  onVerifyDriver: () => void
  onOpenDriverProfile: (userId: string) => void
}) {
  const canDrive = user.driver_verification_status === 'approved'
  const [modalOpen, setModalOpen] = useState(false)
  const { locations, loading: locationsLoading, error: locationsError } = useLocations()
  const [originId, setOriginId] = useState<string | null>(null)
  const [destinationId, setDestinationId] = useState<string | null>(null)

  const handleDriverClick = () => {
    if (canDrive) onChangeActiveRole('driver')
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
          onSelectPassenger={() => onChangeActiveRole('passenger')}
          onDriverClick={handleDriverClick}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        {activeRole === 'passenger' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Поиск поездок</h2>
              <Button variant="outline" size="sm" onClick={onMyTrips}>
                Мои поездки
              </Button>
            </div>
            {locationsLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Загрузка точек маршрута…
              </div>
            ) : locationsError ? (
              <p className="mt-1 text-sm text-danger-foreground">{locationsError}</p>
            ) : (
              <>
                <div className="mt-3">
                  <RouteSelector
                    locations={locations}
                    originId={originId}
                    destinationId={destinationId}
                    onChangeOrigin={setOriginId}
                    onChangeDestination={setDestinationId}
                  />
                </div>
                <PassengerTripSearch
                  user={user}
                  originId={originId}
                  destinationId={destinationId}
                  onOpenDriverProfile={onOpenDriverProfile}
                />
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-foreground">Водитель</h2>
            <div className="mt-3 space-y-2">
              <Button size="lg" className="w-full" onClick={onCreateTrip}>
                Создать поездку
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={onMyTrips}>
                Мои поездки
              </Button>
              <Button variant="ghost" size="lg" className="w-full" disabled>
                Поездки без водителя (скоро)
              </Button>
            </div>
          </>
        )}
      </div>

      <DriverVerificationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        status={user.driver_verification_status}
        onApply={onVerifyDriver}
      />
    </AppScreen>
  )
}
