import { useState } from 'react'
import { AppScreen } from '@/components/AppScreen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { RouteSelector } from '@/components/RouteSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useLocations } from '@/hooks/useLocations'
import { combineDateTimeToISO } from '@/lib/datetime'
import { createTrip } from '@/services/trips'
import { validateRoutePair } from '@/services/locations'
import type { User } from '@/types/db'

const SEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

const todayDate = new Date().toISOString().slice(0, 10)

/** Создание поездки водителем (ТЗ 5.4.1, экран 6.7). */
export function TripCreateScreen({
  user,
  onBack,
  onCreated,
}: {
  user: User
  onBack: () => void
  onCreated: () => void
}) {
  const { locations, loading: locationsLoading, error: locationsError } = useLocations()
  const [originId, setOriginId] = useState<string | null>(null)
  const [destinationId, setDestinationId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState('1')
  const [price, setPrice] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const routeValidation = validateRoutePair(originId, destinationId)
  const routeValid = originId !== null && destinationId !== null && routeValidation.valid

  const handleSubmit = async () => {
    setError(null)

    if (!routeValid || !originId || !destinationId) {
      setError(routeValidation.error ?? 'Выберите точки маршрута')
      return
    }
    if (!date || !time) {
      setError('Укажите дату и время отправления')
      return
    }
    const departureTime = combineDateTimeToISO(date, time)
    if (new Date(departureTime).getTime() <= Date.now()) {
      setError('Время отправления должно быть в будущем')
      return
    }
    let priceValue: number | null = null
    if (price.trim() !== '') {
      priceValue = Number(price)
      if (Number.isNaN(priceValue) || priceValue < 0) {
        setError('Стоимость не может быть отрицательной')
        return
      }
    }

    setSubmitting(true)
    try {
      await createTrip(user.id, {
        originId,
        destinationId,
        departureTime,
        seatsTotal: Number(seats),
        price: priceValue,
        comment: comment.trim() || null,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать поездку')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppScreen>
      <ScreenHeader title="Создать поездку" onBack={onBack} />

      {locationsLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Загрузка точек маршрута…
        </div>
      ) : locationsError ? (
        <p className="mt-6 text-sm text-danger-foreground">{locationsError}</p>
      ) : (
        <div className="mt-6 space-y-4">
          <RouteSelector
            locations={locations}
            originId={originId}
            destinationId={destinationId}
            onChangeOrigin={setOriginId}
            onChangeDestination={setDestinationId}
          />

          {/* min-w-0 на ячейках: иначе нативные date/time-инпуты не дают колонкам ужаться и заезжают друг на друга */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="trip-create-date">Дата отправления</Label>
              <Input
                id="trip-create-date"
                type="date"
                min={todayDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="trip-create-time">Время отправления</Label>
              <Input
                id="trip-create-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-create-seats">Количество мест</Label>
            <Select value={seats} onValueChange={(next) => next && setSeats(next)}>
              <SelectTrigger id="trip-create-seats">
                <SelectValue placeholder="Количество мест" />
              </SelectTrigger>
              <SelectContent>
                {SEAT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-create-price">Стоимость места, ₽ (необязательно)</Label>
            <Input
              id="trip-create-price"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Например, 150"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-create-comment">Комментарий (необязательно)</Label>
            <Textarea
              id="trip-create-comment"
              placeholder="Например, место встречи или детали поездки"
              maxLength={300}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger-foreground">{error}</p>}

          <Button size="lg" className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Spinner className="size-4 text-primary-foreground" />}
            Создать поездку
          </Button>
        </div>
      )}
    </AppScreen>
  )
}
