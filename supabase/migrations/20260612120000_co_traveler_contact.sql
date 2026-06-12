-- Попутчик ИТМО — фикс: профиль водителя доступен подтверждённому пассажиру
-- его поездки (открывается из карточки поездки после принятия заявки).
-- Контракт — ai_context/architecture.md 5.5.1.

-- ---------------------------------------------------------------------------
-- get_co_traveler_contact — расширенный профиль водителя (возраст,
-- описание, telegram-username) для пассажира, у которого есть
-- подтверждённое участие (trip_members.status='confirmed',
-- role_in_trip='passenger') в поездке этого водителя. Если связи нет —
-- функция не возвращает строк (без исключения).
-- SECURITY DEFINER, т.к. RLS users разрешает читать только свою строку —
-- проверка связи через trip_members/trips выполняется внутри функции.
-- ---------------------------------------------------------------------------
create or replace function public.get_co_traveler_contact(p_user_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  course smallint,
  age smallint,
  description text,
  telegram_username text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.full_name, u.avatar_url, u.course, u.age, u.description,
         u.telegram_username
  from public.users u
  where u.id = p_user_id
    and exists (
      select 1
      from public.trip_members tm
      join public.trips t on t.id = tm.trip_id
      where tm.user_id = auth.uid()
        and tm.status = 'confirmed'
        and tm.role_in_trip = 'passenger'
        and t.driver_id = p_user_id
    );
$$;

revoke all on function public.get_co_traveler_contact(uuid) from public;
grant execute on function public.get_co_traveler_contact(uuid) to authenticated;
