-- Попутчик ИТМО — шаг 6: безопасный публичный профиль, защита заявок на
-- поездку и атомарное подтверждение заявки водителем.
-- См. ai_context/architecture.md 5.2, 5.2.1.

-- ---------------------------------------------------------------------------
-- 1. user_public_profiles — безопасная вью профиля (без ИСУ/телефона/роли)
--    для отображения водителя/пассажиров в списках поездок.
--    Работает за счёт дефолтного security_invoker = false для view (PG15+):
--    вью выполняется с правами владельца (роль миграции), который не
--    ограничен RLS на public.users (FORCE ROW LEVEL SECURITY на users не
--    включён). Если в будущем на users включат FORCE ROW LEVEL SECURITY —
--    эта вью перестанет отдавать чужие профили, нужно будет пересмотреть.
-- ---------------------------------------------------------------------------
create view public.user_public_profiles as
select
  u.id,
  u.full_name,
  u.avatar_url,
  u.course
from public.users u;

grant select on public.user_public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Guard-триггер на trip_requests — заявка только на активную чужую
--    поездку (RLS не может проверить статус связанной поездки).
-- ---------------------------------------------------------------------------
create or replace function public.guard_trip_requests_insert()
returns trigger
language plpgsql
as $$
declare
  v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id = new.trip_id;

  if v_trip.id is null then
    raise exception 'Поездка не найдена';
  end if;

  if v_trip.status <> 'active' then
    raise exception 'Нельзя подать заявку на неактивную поездку';
  end if;

  if v_trip.driver_id = new.passenger_id then
    raise exception 'Водитель не может подать заявку на свою поездку';
  end if;

  return new;
end;
$$;

drop trigger if exists trip_requests_guard_insert on public.trip_requests;
create trigger trip_requests_guard_insert
  before insert on public.trip_requests
  for each row execute function public.guard_trip_requests_insert();

-- ---------------------------------------------------------------------------
-- 3. accept_trip_request — атомарное подтверждение заявки водителем:
--    trip_requests -> accepted, trip_members insert, seats_available--.
--    SECURITY INVOKER: каждая из 3 записей уже разрешена RLS водителю
--    поездки (trip_requests_update, trip_members_insert_driver_or_admin,
--    trips_update_owner_or_admin), доп. права не требуются.
-- ---------------------------------------------------------------------------
create or replace function public.accept_trip_request(p_request_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_request public.trip_requests%rowtype;
  v_trip    public.trips%rowtype;
  v_updated int;
begin
  select * into v_request from public.trip_requests where id = p_request_id;
  if v_request.id is null then
    raise exception 'Заявка не найдена';
  end if;

  select * into v_trip from public.trips where id = v_request.trip_id;
  if v_trip.id is null then
    raise exception 'Поездка не найдена';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Заявка уже обработана';
  end if;

  if v_trip.status <> 'active' then
    raise exception 'Поездка неактивна';
  end if;

  if v_trip.seats_available <= 0 then
    raise exception 'Нет свободных мест';
  end if;

  update public.trip_requests
     set status = 'accepted'
   where id = p_request_id
     and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Не удалось подтвердить заявку (нет прав или статус изменился)';
  end if;

  insert into public.trip_members (trip_id, user_id, role_in_trip, status)
  values (v_request.trip_id, v_request.passenger_id, 'passenger', 'confirmed')
  on conflict (trip_id, user_id) do nothing;

  update public.trips
     set seats_available = seats_available - 1
   where id = v_trip.id
     and seats_available > 0;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Не удалось обновить число мест';
  end if;
end;
$$;

revoke all on function public.accept_trip_request(uuid) from public;
grant execute on function public.accept_trip_request(uuid) to authenticated;
