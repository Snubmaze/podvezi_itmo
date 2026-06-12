-- Попутчик ИТМО — публичная информация об авто для карточки поездки
-- (цвет + марка + модель + госномер). См. ai_context/architecture.md 5.2.
--
-- Таблица vehicles по RLS видна только владельцу/админу; пассажиру нужно
-- узнать машину при посадке. По образцу user_public_profiles: вью с
-- дефолтным security_invoker = false выполняется с правами владельца
-- (роль миграции), не ограниченного RLS на vehicles. Наружу — только
-- 6 безопасных полей (без seats_count/photo_url/таймстемпов).

create view public.vehicle_public_info as
select
  v.id,
  v.driver_id,
  v.make,
  v.model,
  v.color,
  v.plate_number
from public.vehicles v;

grant select on public.vehicle_public_info to authenticated;
