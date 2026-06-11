-- Попутчик ИТМО — шаг 5 (фикс): locations/routes — не персональные данные
-- (справочник корпусов/общежитий и маршрутов). Разрешаем чтение анонимным
-- клиентам, чтобы справочник был доступен без Telegram-сессии (dev-режим
-- на мок-авторизации). Решение пользователя — architecture.md 5.2.1/5.2.3.

drop policy if exists locations_select_all on public.locations;
create policy locations_select_all on public.locations
  for select to anon, authenticated
  using (true);

drop policy if exists routes_select_all on public.routes;
create policy routes_select_all on public.routes
  for select to anon, authenticated
  using (true);
