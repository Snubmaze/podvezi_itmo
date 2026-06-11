-- Попутчик ИТМО — шаг 2: RLS-политики.
-- Модель доступа описана в ai_context/architecture.md, раздел 5.2.1.
-- Роли: passenger / driver / admin. ПД (ФИО, ИСУ, телефон, документы) —
-- доступны только владельцу и админу (ФЗ-152).

-- ---------------------------------------------------------------------------
-- Хелпер: проверка роли admin без рекурсии RLS (SECURITY DEFINER).
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Включаем RLS на всех таблицах
-- ---------------------------------------------------------------------------
alter table public.users               enable row level security;
alter table public.locations           enable row level security;
alter table public.routes              enable row level security;
alter table public.vehicles            enable row level security;
alter table public.driver_documents    enable row level security;
alter table public.moderation_requests enable row level security;
alter table public.trips               enable row level security;
alter table public.trip_members        enable row level security;
alter table public.trip_requests       enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy users_select_self_or_admin on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy users_update_self_or_admin on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy users_delete_admin on public.users
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- locations — чтение всем аутентифицированным, запись только админ
-- ---------------------------------------------------------------------------
create policy locations_select_all on public.locations
  for select to authenticated
  using (true);

create policy locations_write_admin on public.locations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- routes — чтение всем, запись только админ
-- ---------------------------------------------------------------------------
create policy routes_select_all on public.routes
  for select to authenticated
  using (true);

create policy routes_write_admin on public.routes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- vehicles — владелец или админ
-- ---------------------------------------------------------------------------
create policy vehicles_select_owner_or_admin on public.vehicles
  for select to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy vehicles_insert_owner on public.vehicles
  for insert to authenticated
  with check (driver_id = auth.uid());

create policy vehicles_update_owner_or_admin on public.vehicles
  for update to authenticated
  using (driver_id = auth.uid() or public.is_admin())
  with check (driver_id = auth.uid() or public.is_admin());

create policy vehicles_delete_owner_or_admin on public.vehicles
  for delete to authenticated
  using (driver_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- driver_documents — ПД: владелец или админ; смена статуса только админ
-- ---------------------------------------------------------------------------
create policy driver_documents_select_owner_or_admin on public.driver_documents
  for select to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy driver_documents_insert_owner on public.driver_documents
  for insert to authenticated
  with check (driver_id = auth.uid());

create policy driver_documents_update_admin on public.driver_documents
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy driver_documents_delete_owner_or_admin on public.driver_documents
  for delete to authenticated
  using (driver_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- moderation_requests — заявитель видит свои; решает только админ
-- ---------------------------------------------------------------------------
create policy moderation_select_owner_or_admin on public.moderation_requests
  for select to authenticated
  using (requester_id = auth.uid() or public.is_admin());

create policy moderation_insert_owner on public.moderation_requests
  for insert to authenticated
  with check (requester_id = auth.uid());

create policy moderation_update_admin on public.moderation_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- trips — чтение всем; создавать может только верифицированный водитель
-- ---------------------------------------------------------------------------
create policy trips_select_all on public.trips
  for select to authenticated
  using (true);

create policy trips_insert_verified_driver on public.trips
  for insert to authenticated
  with check (
    driver_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('driver', 'admin')
        and u.driver_verification_status = 'approved'
    )
  );

create policy trips_update_owner_or_admin on public.trips
  for update to authenticated
  using (driver_id = auth.uid() or public.is_admin())
  with check (driver_id = auth.uid() or public.is_admin());

create policy trips_delete_owner_or_admin on public.trips
  for delete to authenticated
  using (driver_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- trip_members — участник / водитель поездки / админ
-- ---------------------------------------------------------------------------
create policy trip_members_select on public.trip_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  );

-- Добавляет участников водитель поездки или админ
create policy trip_members_insert_driver_or_admin on public.trip_members
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  );

-- Обновлять статус может водитель поездки, админ или сам участник (отмена)
create policy trip_members_update on public.trip_members
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  );

create policy trip_members_delete_driver_or_admin on public.trip_members
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- trip_requests — пассажир / водитель поездки / админ
-- ---------------------------------------------------------------------------
create policy trip_requests_select on public.trip_requests
  for select to authenticated
  using (
    passenger_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  );

create policy trip_requests_insert_passenger on public.trip_requests
  for insert to authenticated
  with check (passenger_id = auth.uid());

-- Пассажир может отменить свою заявку; водитель поездки — принять/отклонить
create policy trip_requests_update on public.trip_requests
  for update to authenticated
  using (
    passenger_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  )
  with check (
    passenger_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.driver_id = auth.uid()
    )
  );

create policy trip_requests_delete_owner_or_admin on public.trip_requests
  for delete to authenticated
  using (passenger_id = auth.uid() or public.is_admin());
