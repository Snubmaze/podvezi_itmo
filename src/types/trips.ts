/**
 * Композитные типы для поездок (шаг 6) — результаты `services/trips.ts`,
 * собранные из `trips`/`locations`/`trip_requests`/`trip_members`/
 * `user_public_profiles`. Базовые типы таблиц — см. `types/db.ts`.
 */

import type {
  Location,
  Trip,
  TripMember,
  TripRequest,
  UserPublicProfile,
} from '@/types/db'

/** Поездка с развёрнутыми точками маршрута и публичным профилем водителя. */
export interface TripWithRoute extends Trip {
  origin: Location
  destination: Location
  driver: UserPublicProfile | null
}

/** Заявка пассажира с развёрнутой поездкой ("Мои поездки", вид пассажира). */
export interface TripRequestWithTrip extends TripRequest {
  trip: TripWithRoute
}

/** Заявка с публичным профилем пассажира ("Мои поездки", вид водителя). */
export interface TripRequestWithPassenger extends TripRequest {
  passenger: UserPublicProfile | null
}

/** Участник поездки с публичным профилем ("Мои поездки", вид водителя). */
export interface TripMemberWithPassenger extends TripMember {
  passenger: UserPublicProfile | null
}

/** Поездка водителя со списком заявок и участников ("Мои поездки", вид водителя). */
export interface DriverTripWithDetails extends TripWithRoute {
  /** Заявки в статусе `pending`. */
  requests: TripRequestWithPassenger[]
  /** Участники в статусе `confirmed`. */
  members: TripMemberWithPassenger[]
}

/** Фильтры поиска поездок (ТЗ 5.7). */
export interface TripSearchFilters {
  originId: string | null
  destinationId: string | null
  /** Дата отправления, YYYY-MM-DD, или null = без фильтра по дате. */
  date: string | null
  /** Время "от", HH:mm — учитывается только если задан `date`. */
  timeFrom: string | null
}

/** Входные данные создания поездки (форма TripCreateScreen, ТЗ 5.4.1). */
export interface CreateTripInput {
  originId: string
  destinationId: string
  /** ISO 8601, собирается из даты+времени на клиенте. */
  departureTime: string
  /** 1..8 */
  seatsTotal: number
  price: number | null
  comment: string | null
}
