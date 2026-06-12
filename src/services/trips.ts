/**
 * Доменный сервис поездок: создание (ТЗ 5.4/5.4.1), поиск (ТЗ 5.7) и
 * заявки на участие с подтверждением водителем (`trip_requests` ->
 * `trip_members`, шаг 6).
 */

import { combineDateTimeToISO, nowIso, startOfDayISO, startOfNextDayISO } from '@/lib/datetime'
import { supabase } from '@/lib/supabase'
import { validateRoutePair } from '@/services/locations'
import type {
  Location,
  Trip,
  TripMember,
  TripRequest,
  UserPublicProfile,
  VehiclePublicInfo,
} from '@/types/db'
import type {
  CoTravelerContact,
  CreateTripInput,
  DriverTripWithDetails,
  TripRequestWithTrip,
  TripSearchFilters,
  TripWithRoute,
} from '@/types/trips'

const ROUTE_SELECT =
  '*, origin:locations!trips_origin_id_fkey(*), destination:locations!trips_destination_id_fkey(*)'

type TripWithLocations = Trip & { origin: Location; destination: Location }

/** Загружает безопасные публичные профили (вью `user_public_profiles`). */
async function fetchPublicProfiles(
  userIds: (string | null)[],
): Promise<Map<string, UserPublicProfile>> {
  const uniqueIds = [...new Set(userIds.filter((id): id is string => id !== null))]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('user_public_profiles')
    .select('*')
    .in('id', uniqueIds)

  if (error) throw new Error('Не удалось загрузить профили пользователей')

  const profiles = data as UserPublicProfile[]
  return new Map(profiles.map((profile) => [profile.id, profile]))
}

/**
 * Загружает публичную информацию об авто водителей (вью
 * `vehicle_public_info`). У водителя по MVP одно авто — для каждого
 * `driver_id` берётся одна запись.
 */
async function fetchDriverVehicles(
  driverIds: (string | null)[],
): Promise<Map<string, VehiclePublicInfo>> {
  const uniqueIds = [...new Set(driverIds.filter((id): id is string => id !== null))]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('vehicle_public_info')
    .select('*')
    .in('driver_id', uniqueIds)

  if (error) throw new Error('Не удалось загрузить информацию об авто')

  const vehicles = data as VehiclePublicInfo[]
  return new Map(vehicles.map((vehicle) => [vehicle.driver_id, vehicle]))
}

/** Публичный профиль одного пользователя (вью `user_public_profiles`). */
export async function getPublicProfile(userId: string): Promise<UserPublicProfile | null> {
  const { data, error } = await supabase
    .from('user_public_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error('Не удалось загрузить профиль пользователя')
  return data as UserPublicProfile | null
}

/** Создаёт поездку (ТЗ 5.4.1). `vehicle_id` пока не используется (шаг 7). */
export async function createTrip(driverId: string, input: CreateTripInput): Promise<Trip> {
  const routeValidation = validateRoutePair(input.originId, input.destinationId)
  if (!routeValidation.valid) {
    throw new Error(routeValidation.error ?? 'Некорректный маршрут')
  }
  if (!Number.isInteger(input.seatsTotal) || input.seatsTotal < 1 || input.seatsTotal > 8) {
    throw new Error('Количество мест должно быть от 1 до 8')
  }
  if (input.price !== null && (Number.isNaN(input.price) || input.price < 0)) {
    throw new Error('Стоимость не может быть отрицательной')
  }
  if (new Date(input.departureTime).getTime() <= Date.now()) {
    throw new Error('Время отправления должно быть в будущем')
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({
      driver_id: driverId,
      vehicle_id: null,
      origin_id: input.originId,
      destination_id: input.destinationId,
      route_id: null,
      departure_time: input.departureTime,
      seats_total: input.seatsTotal,
      seats_available: input.seatsTotal,
      price: input.price,
      status: 'active',
      comment: input.comment,
    })
    .select()
    .single()

  if (error) throw new Error('Не удалось создать поездку')
  return data as Trip
}

/**
 * Поиск активных поездок с фильтрами (ТЗ 5.7): точка отправления/
 * назначения, дата, время. Если `excludeDriverId` задан — поездки этого
 * водителя исключаются (не предлагать пассажиру присоединиться к своей же
 * поездке).
 *
 * Семантика дата/время: если `date` не задан — только будущие поездки
 * (`departure_time >= now`), `timeFrom` без `date` игнорируется. Если
 * `date` задан — поездки в пределах этих суток; если вдобавок задан
 * `timeFrom` — нижняя граница суток заменяется на `date`+`timeFrom`.
 */
export async function searchTrips(
  filters: TripSearchFilters,
  excludeDriverId?: string,
): Promise<TripWithRoute[]> {
  let query = supabase
    .from('trips')
    .select(ROUTE_SELECT)
    .eq('status', 'active')
    .order('departure_time', { ascending: true })

  if (filters.originId) query = query.eq('origin_id', filters.originId)
  if (filters.destinationId) query = query.eq('destination_id', filters.destinationId)
  if (excludeDriverId) query = query.neq('driver_id', excludeDriverId)

  if (filters.date) {
    const from = filters.timeFrom
      ? combineDateTimeToISO(filters.date, filters.timeFrom)
      : startOfDayISO(filters.date)
    query = query.gte('departure_time', from).lt('departure_time', startOfNextDayISO(filters.date))
  } else {
    query = query.gte('departure_time', nowIso())
  }

  const { data, error } = await query
  if (error) throw new Error('Не удалось загрузить список поездок')

  const trips = data as TripWithLocations[]
  const driverIds = trips.map((trip) => trip.driver_id)
  const [profiles, vehicles] = await Promise.all([
    fetchPublicProfiles(driverIds),
    fetchDriverVehicles(driverIds),
  ])

  return trips.map((trip) => ({
    ...trip,
    driver: trip.driver_id ? profiles.get(trip.driver_id) ?? null : null,
    vehicle: trip.driver_id ? vehicles.get(trip.driver_id) ?? null : null,
  }))
}

/**
 * Поездки текущего пользователя как водителя, с заявками (`pending`) и
 * подтверждёнными участниками (`confirmed`) — для "Мои поездки" (вид
 * водителя).
 */
export async function getMyDriverTrips(driverId: string): Promise<DriverTripWithDetails[]> {
  const { data: tripsData, error: tripsError } = await supabase
    .from('trips')
    .select(ROUTE_SELECT)
    .eq('driver_id', driverId)
    .order('departure_time', { ascending: false })

  if (tripsError) throw new Error('Не удалось загрузить ваши поездки')

  const trips = tripsData as TripWithLocations[]
  if (trips.length === 0) return []

  const tripIds = trips.map((trip) => trip.id)

  const [requestsResult, membersResult] = await Promise.all([
    supabase
      .from('trip_requests')
      .select('*')
      .in('trip_id', tripIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('trip_members')
      .select('*')
      .in('trip_id', tripIds)
      .eq('status', 'confirmed')
      .order('joined_at', { ascending: true }),
  ])

  if (requestsResult.error || membersResult.error) {
    throw new Error('Не удалось загрузить заявки и участников поездок')
  }

  const requests = requestsResult.data as TripRequest[]
  const members = membersResult.data as TripMember[]

  const profiles = await fetchPublicProfiles([
    ...requests.map((request) => request.passenger_id),
    ...members.map((member) => member.user_id),
  ])

  return trips.map((trip) => ({
    ...trip,
    driver: null,
    vehicle: null,
    requests: requests
      .filter((request) => request.trip_id === trip.id)
      .map((request) => ({
        ...request,
        passenger: profiles.get(request.passenger_id) ?? null,
      })),
    members: members
      .filter((member) => member.trip_id === trip.id)
      .map((member) => ({
        ...member,
        passenger: profiles.get(member.user_id) ?? null,
      })),
  }))
}

/**
 * Заявки текущего пользователя на участие в поездках, с развёрнутой
 * поездкой и профилем водителя — для "Мои поездки" (вид пассажира).
 */
export async function getMyPassengerTrips(passengerId: string): Promise<TripRequestWithTrip[]> {
  const { data, error } = await supabase
    .from('trip_requests')
    .select(`*, trip:trips(${ROUTE_SELECT})`)
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Не удалось загрузить ваши заявки')

  const requests = data as (TripRequest & { trip: TripWithLocations })[]
  if (requests.length === 0) return []

  const driverIds = requests.map((request) => request.trip.driver_id)
  const [profiles, vehicles] = await Promise.all([
    fetchPublicProfiles(driverIds),
    fetchDriverVehicles(driverIds),
  ])

  return requests.map((request) => ({
    ...request,
    trip: {
      ...request.trip,
      driver: request.trip.driver_id ? profiles.get(request.trip.driver_id) ?? null : null,
      vehicle: request.trip.driver_id ? vehicles.get(request.trip.driver_id) ?? null : null,
    },
  }))
}

/**
 * Подаёт заявку на участие в поездке (статус `pending`). Подтверждение —
 * водителем, через `acceptTripRequest`.
 */
export async function joinTrip(passengerId: string, tripId: string): Promise<TripRequest> {
  const { data, error } = await supabase
    .from('trip_requests')
    .insert({ trip_id: tripId, passenger_id: passengerId, status: 'pending' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Вы уже подавали заявку на эту поездку')
    }
    if (error.code === 'P0001' && error.message) {
      throw new Error(error.message)
    }
    throw new Error('Не удалось подать заявку на поездку')
  }

  return data as TripRequest
}

/**
 * Подтверждает заявку (водитель поездки): атомарно переводит заявку в
 * `accepted`, добавляет подтверждённого участника и уменьшает
 * `seats_available` (RPC `accept_trip_request`).
 */
export async function acceptTripRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_trip_request', { p_request_id: requestId })
  if (error) throw new Error(error.message || 'Не удалось подтвердить заявку')
}

/** Отклоняет заявку (водитель поездки). */
export async function rejectTripRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) throw new Error('Не удалось отклонить заявку')
}

/**
 * Профиль водителя с контактами (ТЗ 5.5.1) — доступен пассажиру только при
 * подтверждённом участии в поездке этого водителя (RPC
 * `get_co_traveler_contact`). Если связи нет — возвращает `null`.
 */
export async function getCoTravelerContact(userId: string): Promise<CoTravelerContact | null> {
  const { data, error } = await supabase
    .rpc('get_co_traveler_contact', { p_user_id: userId })
    .maybeSingle()

  if (error) throw new Error('Не удалось загрузить профиль водителя')
  return data as CoTravelerContact | null
}

/** Отменяет собственную заявку (только пока она `pending`). */
export async function cancelTripRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_requests')
    .delete()
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) throw new Error('Не удалось отменить заявку')
}
