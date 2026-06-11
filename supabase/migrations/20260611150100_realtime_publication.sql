-- Попутчик ИТМО — шаг 6: добавление trips/trip_members/trip_requests в
-- публикацию supabase_realtime (обновление списков поездок/заявок в
-- реальном времени, ТЗ раздел 10). См. ai_context/architecture.md 5.4.
--
-- Realtime уважает RLS: для trips (SELECT всем authenticated) события
-- видят все, для trip_requests/trip_members — только участник/водитель/
-- админ соответствующей поездки.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_members'
  ) then
    alter publication supabase_realtime add table public.trip_members;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_requests'
  ) then
    alter publication supabase_realtime add table public.trip_requests;
  end if;
end $$;
