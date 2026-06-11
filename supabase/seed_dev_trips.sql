-- Попутчик ИТМО — dev-данные для проверки поиска поездок (шаг 6).
-- НЕ миграция схемы, выполнить вручную через SQL Editor.
-- Идемпотентно: повторный запуск не плодит дубликаты.
--
-- Создаёт тестового пользователя-водителя (driver_verification_status =
-- 'approved') и две активные поездки от его имени по существующим точкам
-- из справочника locations. driver_id ссылается на отдельного
-- пользователя — иначе фильтр excludeDriverId в поиске пассажира скрыл бы
-- поездки от вашего собственного аккаунта.

-- ---------------------------------------------------------------------------
-- 1. Тестовый водитель (auth.users + public.users)
-- ---------------------------------------------------------------------------
with new_auth_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test-driver-seed@podvezi.local',
    crypt('test-driver-seed', gen_salt('bf')),
    now(),
    '{"provider":"telegram","providers":["telegram"]}',
    '{}',
    now(), now(), '', '', '', ''
  where not exists (
    select 1 from public.users where telegram_username = 'test_driver_seed'
  )
  returning id
)
insert into public.users (
  id, telegram_id, telegram_username, full_name, isu_number,
  itmo_id_linked, role, driver_verification_status
)
select id, 900000001, 'test_driver_seed', 'Тестовый Водитель', 'TEST-SEED-DRIVER',
       true, 'driver', 'approved'
from new_auth_user;

-- ---------------------------------------------------------------------------
-- 2. Две активные поездки от тестового водителя
-- ---------------------------------------------------------------------------
insert into public.trips (
  driver_id, origin_id, destination_id, departure_time,
  seats_total, seats_available, price, status, comment
)
select
  (select id from public.users where telegram_username = 'test_driver_seed'),
  (select id from public.locations where name = 'Кронверкский, 49'),
  (select id from public.locations where name = 'ITMO Aparts'),
  timestamptz '2026-06-12 09:00:00+03',
  3, 3, 150, 'active'::public.trip_status, 'Еду на учёбу, можно с сумкой'
where not exists (
  select 1 from public.trips
  where driver_id = (select id from public.users where telegram_username = 'test_driver_seed')
    and origin_id = (select id from public.locations where name = 'Кронверкский, 49')
    and destination_id = (select id from public.locations where name = 'ITMO Aparts')
    and departure_time = timestamptz '2026-06-12 09:00:00+03'
)
union all
select
  (select id from public.users where telegram_username = 'test_driver_seed'),
  (select id from public.locations where name = 'Ломоносова, 9'),
  (select id from public.locations where name = 'Альпийский, 15'),
  timestamptz '2026-06-12 18:30:00+03',
  1, 1, null, 'active'::public.trip_status, null
where not exists (
  select 1 from public.trips
  where driver_id = (select id from public.users where telegram_username = 'test_driver_seed')
    and origin_id = (select id from public.locations where name = 'Ломоносова, 9')
    and destination_id = (select id from public.locations where name = 'Альпийский, 15')
    and departure_time = timestamptz '2026-06-12 18:30:00+03'
);

-- ---------------------------------------------------------------------------
-- Очистка (выполнить при необходимости вручную, раскомментировав):
-- ---------------------------------------------------------------------------
-- delete from public.trips
--   where driver_id = (select id from public.users where telegram_username = 'test_driver_seed');
-- delete from public.users where telegram_username = 'test_driver_seed';
-- delete from auth.users where email = 'test-driver-seed@podvezi.local';
