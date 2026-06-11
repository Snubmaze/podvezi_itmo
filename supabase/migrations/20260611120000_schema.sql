-- Попутчик ИТМО — шаг 2: схема БД (enums, таблицы, индексы, триггеры).
-- Источник истины: ai_context/architecture.md, раздел 5.2.
-- Все таблицы создаются в схеме public; RLS включается отдельной миграцией
-- (20260611120100_rls.sql).

-- ---------------------------------------------------------------------------
-- 0. Расширения
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. Enum-типы (см. architecture.md 5.2.2)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('passenger', 'driver', 'admin');

create type public.driver_verification_status as enum
  ('none', 'pending', 'approved', 'rejected');

create type public.location_kind as enum ('campus', 'dormitory');

create type public.document_type as enum ('license', 'sts');

create type public.document_status as enum ('pending', 'approved', 'rejected');

create type public.moderation_type as enum ('driver_verification');

create type public.moderation_status as enum ('pending', 'approved', 'rejected');

create type public.trip_status as enum ('active', 'completed', 'cancelled');

create type public.trip_member_role as enum ('driver', 'passenger');

create type public.trip_member_status as enum
  ('confirmed', 'cancelled', 'completed', 'no_show');

create type public.trip_request_status as enum
  ('pending', 'accepted', 'rejected', 'cancelled');

-- ---------------------------------------------------------------------------
-- 2. Вспомогательный триггер updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. users — профиль (id = auth.users.id)
-- ---------------------------------------------------------------------------
create table public.users (
  id                          uuid primary key
                                references auth.users (id) on delete cascade,
  telegram_id                 bigint not null unique,
  telegram_username           text,
  full_name                   text,
  isu_number                  text unique,
  itmo_id_linked              boolean not null default false,
  course                      smallint check (course is null or course between 1 and 8),
  age                         smallint check (age is null or age between 14 and 100),
  description                 text,
  role                        public.user_role not null default 'passenger',
  driver_verification_status  public.driver_verification_status
                                not null default 'none',
  phone                       text,
  avatar_url                  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index users_role_idx on public.users (role);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. locations — единый справочник точек (корпуса + общежития)
-- ---------------------------------------------------------------------------
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  kind        public.location_kind not null,
  name        text not null,
  address     text,
  latitude    numeric(9, 6),
  longitude   numeric(9, 6),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index locations_kind_idx on public.locations (kind);

-- ---------------------------------------------------------------------------
-- 5. routes — справочник допустимых комбинаций точек
-- ---------------------------------------------------------------------------
create table public.routes (
  id              uuid primary key default gen_random_uuid(),
  origin_id       uuid not null references public.locations (id) on delete cascade,
  destination_id  uuid not null references public.locations (id) on delete cascade,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint routes_distinct_points check (origin_id <> destination_id),
  constraint routes_unique_pair unique (origin_id, destination_id)
);

-- ---------------------------------------------------------------------------
-- 6. vehicles — автомобили водителей
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.users (id) on delete cascade,
  make          text not null,
  model         text not null,
  color         text,
  plate_number  text not null,
  seats_count   smallint not null check (seats_count between 1 and 8),
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index vehicles_driver_idx on public.vehicles (driver_id);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. driver_documents — документы водителя (ПД, приватный bucket)
-- ---------------------------------------------------------------------------
create table public.driver_documents (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid not null references public.users (id) on delete cascade,
  document_type  public.document_type not null,
  file_path      text not null,
  status         public.document_status not null default 'pending',
  comment        text,
  reviewed_by    uuid references public.users (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index driver_documents_driver_idx on public.driver_documents (driver_id);
create index driver_documents_status_idx on public.driver_documents (status);

-- ---------------------------------------------------------------------------
-- 8. moderation_requests — история заявок/решений модерации
-- ---------------------------------------------------------------------------
create table public.moderation_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.users (id) on delete cascade,
  type          public.moderation_type not null default 'driver_verification',
  status        public.moderation_status not null default 'pending',
  payload       jsonb,
  comment       text,
  reviewed_by   uuid references public.users (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index moderation_requests_requester_idx
  on public.moderation_requests (requester_id);
create index moderation_requests_status_idx
  on public.moderation_requests (status);

-- ---------------------------------------------------------------------------
-- 9. trips — поездки
-- ---------------------------------------------------------------------------
create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  driver_id        uuid references public.users (id) on delete set null,
  vehicle_id       uuid references public.vehicles (id) on delete set null,
  origin_id        uuid not null references public.locations (id),
  destination_id   uuid not null references public.locations (id),
  route_id         uuid references public.routes (id) on delete set null,
  departure_time   timestamptz not null,
  seats_total      smallint not null check (seats_total between 1 and 8),
  seats_available  smallint not null check (seats_available >= 0),
  price            numeric(10, 2) check (price is null or price >= 0),
  status           public.trip_status not null default 'active',
  comment          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint trips_distinct_points check (origin_id <> destination_id),
  constraint trips_seats_available_le_total check (seats_available <= seats_total)
);

create index trips_status_idx on public.trips (status);
create index trips_departure_idx on public.trips (departure_time);
create index trips_driver_idx on public.trips (driver_id);
create index trips_origin_dest_idx on public.trips (origin_id, destination_id);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. trip_members — подтверждённые участники
-- ---------------------------------------------------------------------------
create table public.trip_members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  role_in_trip  public.trip_member_role not null,
  status        public.trip_member_status not null default 'confirmed',
  joined_at     timestamptz not null default now(),
  constraint trip_members_unique_member unique (trip_id, user_id)
);

create index trip_members_trip_idx on public.trip_members (trip_id);
create index trip_members_user_idx on public.trip_members (user_id);

-- ---------------------------------------------------------------------------
-- 11. trip_requests — заявки пассажиров на присоединение
-- ---------------------------------------------------------------------------
create table public.trip_requests (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  passenger_id  uuid not null references public.users (id) on delete cascade,
  status        public.trip_request_status not null default 'pending',
  message       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint trip_requests_unique_pair unique (trip_id, passenger_id)
);

create index trip_requests_trip_idx on public.trip_requests (trip_id);
create index trip_requests_passenger_idx on public.trip_requests (passenger_id);
create index trip_requests_status_idx on public.trip_requests (status);

create trigger trip_requests_set_updated_at
  before update on public.trip_requests
  for each row execute function public.set_updated_at();
