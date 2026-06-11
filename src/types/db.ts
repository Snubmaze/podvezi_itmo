/**
 * Типы БД «Попутчик ИТМО» — синхронизированы со схемой Supabase.
 * Источник истины: ai_context/architecture.md (раздел 5.2) и
 * supabase/migrations/20260611120000_schema.sql.
 *
 * При изменении схемы: сначала architecture.md → миграция → этот файл.
 */

// --- Enum'ы (см. architecture.md 5.2.2) ----------------------------------

export type UserRole = 'passenger' | 'driver' | 'admin'

export type DriverVerificationStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'

export type LocationKind = 'campus' | 'dormitory'

export type DocumentType = 'license' | 'sts'

export type DocumentStatus = 'pending' | 'approved' | 'rejected'

export type ModerationType = 'driver_verification'

export type ModerationStatus = 'pending' | 'approved' | 'rejected'

export type TripStatus = 'active' | 'completed' | 'cancelled'

export type TripMemberRole = 'driver' | 'passenger'

export type TripMemberStatus =
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type TripRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'

// --- Строки таблиц --------------------------------------------------------

export interface User {
  id: string
  telegram_id: number
  telegram_username: string | null
  full_name: string | null
  isu_number: string | null
  itmo_id_linked: boolean
  course: number | null
  age: number | null
  description: string | null
  role: UserRole
  driver_verification_status: DriverVerificationStatus
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  kind: LocationKind
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  created_at: string
}

export interface Route {
  id: string
  origin_id: string
  destination_id: string
  is_active: boolean
  created_at: string
}

export interface Vehicle {
  id: string
  driver_id: string
  make: string
  model: string
  color: string | null
  plate_number: string
  seats_count: number
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface DriverDocument {
  id: string
  driver_id: string
  document_type: DocumentType
  file_path: string
  status: DocumentStatus
  comment: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface ModerationRequest {
  id: string
  requester_id: string
  type: ModerationType
  status: ModerationStatus
  payload: Record<string, unknown> | null
  comment: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface Trip {
  id: string
  driver_id: string | null
  vehicle_id: string | null
  origin_id: string
  destination_id: string
  route_id: string | null
  departure_time: string
  seats_total: number
  seats_available: number
  price: number | null
  status: TripStatus
  comment: string | null
  created_at: string
  updated_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role_in_trip: TripMemberRole
  status: TripMemberStatus
  joined_at: string
}

export interface TripRequest {
  id: string
  trip_id: string
  passenger_id: string
  status: TripRequestStatus
  message: string | null
  created_at: string
  updated_at: string
}
