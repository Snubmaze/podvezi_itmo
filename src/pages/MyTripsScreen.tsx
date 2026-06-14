import { useState } from 'react'
import { AppScreen } from '@/components/AppScreen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { TripCard } from '@/components/TripCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { ActiveRole } from '@/components/RoleSwitcher'
import { useMyDriverTrips } from '@/hooks/useMyDriverTrips'
import { useMyPassengerTrips } from '@/hooks/useMyPassengerTrips'
import { tripRequestStatusBadge } from '@/lib/tripRequestStatus'
import { tripStatusBadge } from '@/lib/tripStatus'
import { acceptTripRequest, cancelTripRequest, rejectTripRequest } from '@/services/trips'
import type { User } from '@/types/db'
import type { DriverTripWithDetails, TripRequestWithTrip } from '@/types/trips'

/** Карточка поездки водителя с заявками и подтверждёнными пассажирами. */
function DriverTripCard({
  trip,
  onActed,
}: {
  trip: DriverTripWithDetails
  onActed: () => void
}) {
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const runAction = async (requestId: string, action: (id: string) => Promise<void>) => {
    setPending((prev) => ({ ...prev, [requestId]: true }))
    setErrors((prev) => ({ ...prev, [requestId]: '' }))
    try {
      await action(requestId)
      onActed()
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [requestId]: err instanceof Error ? err.message : 'Не удалось выполнить действие',
      }))
    } finally {
      setPending((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const badge = tripStatusBadge(trip.status)

  return (
    <div className="space-y-3">
      <TripCard trip={trip} badge={<Badge variant={badge.variant}>{badge.label}</Badge>} />

      <div className="space-y-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">Заявки</h3>
        {trip.requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Заявок пока нет</p>
        ) : (
          <ul className="space-y-2">
            {trip.requests.map((request) => (
              <li key={request.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                      url={request.passenger?.avatar_url ?? null}
                      name={request.passenger?.full_name ?? null}
                      className="size-7 shrink-0 text-xs"
                    />
                    <span className="truncate text-sm text-foreground">
                      {request.passenger?.full_name ?? 'Студент ИТМО'}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => runAction(request.id, acceptTripRequest)}
                      disabled={pending[request.id]}
                    >
                      Принять
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runAction(request.id, rejectTripRequest)}
                      disabled={pending[request.id]}
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
                {errors[request.id] && (
                  <p className="text-sm text-danger-foreground">{errors[request.id]}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">Пассажиры</h3>
        {trip.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пассажиров пока нет</p>
        ) : (
          <ul className="space-y-2">
            {trip.members.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <Avatar
                  url={member.passenger?.avatar_url ?? null}
                  name={member.passenger?.full_name ?? null}
                  className="size-7 shrink-0 text-xs"
                />
                <span className="truncate text-sm text-foreground">
                  {member.passenger?.full_name ?? 'Студент ИТМО'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Список поездок текущего пользователя как водителя. */
function DriverTrips({ user }: { user: User }) {
  const { trips, loading, error, refetch } = useMyDriverTrips(user.id)

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Загрузка поездок…
      </div>
    )
  }
  if (error) {
    return <p className="mt-6 text-sm text-danger-foreground">{error}</p>
  }
  if (trips.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">У вас пока нет поездок</p>
  }

  return (
    <div className="mt-6 space-y-6">
      {trips.map((trip) => (
        <DriverTripCard key={trip.id} trip={trip} onActed={refetch} />
      ))}
    </div>
  )
}

/** Карточка заявки пассажира на поездку. */
function PassengerRequestCard({
  request,
  onActed,
  onOpenDriverProfile,
}: {
  request: TripRequestWithTrip
  onActed: () => void
  onOpenDriverProfile: (userId: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const badge = tripRequestStatusBadge(request.status)

  const handleCancel = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await cancelTripRequest(request.id)
      onActed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отменить заявку')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TripCard
      trip={request.trip}
      showDriver
      onDriverClick={onOpenDriverProfile}
      badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
      footer={
        <div className="space-y-1.5">
          {request.status === 'pending' && (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
              {submitting && <Spinner className="size-4" />}
              Отменить заявку
            </Button>
          )}
          {error && <p className="text-sm text-danger-foreground">{error}</p>}
        </div>
      }
    />
  )
}

/** Список заявок текущего пользователя как пассажира. */
function PassengerTrips({
  user,
  onOpenDriverProfile,
}: {
  user: User
  onOpenDriverProfile: (userId: string) => void
}) {
  const { requests, loading, error, refetch } = useMyPassengerTrips(user.id)

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Загрузка заявок…
      </div>
    )
  }
  if (error) {
    return <p className="mt-6 text-sm text-danger-foreground">{error}</p>
  }
  if (requests.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">Вы пока не подавали заявок</p>
  }

  return (
    <div className="mt-6 space-y-3">
      {requests.map((request) => (
        <PassengerRequestCard
          key={request.id}
          request={request}
          onActed={refetch}
          onOpenDriverProfile={onOpenDriverProfile}
        />
      ))}
    </div>
  )
}

/** "Мои поездки" (экран 6.6/6.8): для водителя — заявки и пассажиры по созданным поездкам, для пассажира — поданные заявки. */
export function MyTripsScreen({
  user,
  activeRole,
  onBack,
  onOpenDriverProfile,
}: {
  user: User
  activeRole: ActiveRole
  onBack: () => void
  onOpenDriverProfile: (userId: string) => void
}) {
  return (
    <AppScreen>
      <ScreenHeader title="Мои поездки" onBack={onBack} />

      {activeRole === 'driver' ? (
        <DriverTrips user={user} />
      ) : (
        <PassengerTrips user={user} onOpenDriverProfile={onOpenDriverProfile} />
      )}
    </AppScreen>
  )
}
