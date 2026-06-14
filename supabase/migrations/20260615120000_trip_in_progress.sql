-- Добавляет статус «В пути» в жизненный цикл поездки (architecture.md 5.2.2).
-- Набор trip_status: active → in_progress → completed (+ cancelled из active/in_progress).
-- Статус виден всем (RLS trips: SELECT для всех authenticated), управляет им водитель.

alter type public.trip_status add value if not exists 'in_progress' after 'active';
