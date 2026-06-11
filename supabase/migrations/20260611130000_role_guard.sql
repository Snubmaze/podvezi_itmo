-- Попутчик ИТМО — шаг 4: защита привилегированных полей users + гейт прав
-- водителя по статусу верификации. См. ai_context/architecture.md 5.1.1, 5.2.1.

-- ---------------------------------------------------------------------------
-- 1. Триггер-страж обновления users (против self-escalation).
--    Активная роль локальна (не персистится), поэтому пользователь не должен
--    уметь сам стать admin или сам себе выставить approved/rejected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_users_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Серверные/админские контексты — без ограничений.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Нельзя self-assign роль admin.
  if new.role = 'admin' and old.role is distinct from 'admin' then
    raise exception 'Недостаточно прав для назначения роли admin';
  end if;

  -- Статус верификации: пользователь может лишь подать/переподать заявку
  -- (none/rejected -> pending). approved/rejected ставит только админ.
  if new.driver_verification_status is distinct from old.driver_verification_status then
    if not (
      old.driver_verification_status in ('none', 'rejected')
      and new.driver_verification_status = 'pending'
    ) then
      raise exception 'Статус верификации меняет только администратор';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_update on public.users;
create trigger users_guard_update
  before update on public.users
  for each row execute function public.guard_users_update();

-- ---------------------------------------------------------------------------
-- 2. trips INSERT — гейт по driver_verification_status = approved
--    (без требования role='driver', т.к. активная роль локальна).
-- ---------------------------------------------------------------------------
drop policy if exists trips_insert_verified_driver on public.trips;
create policy trips_insert_verified_driver on public.trips
  for insert to authenticated
  with check (
    driver_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.driver_verification_status = 'approved'
    )
  );
