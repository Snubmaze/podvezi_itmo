-- Попутчик ИТМО — шаг 2: сид-данные справочников.
-- Классификация точек подтверждена пользователем на шаге 2.
-- Идемпотентно: повторный запуск не плодит дубликаты (guard по name).

-- ---------------------------------------------------------------------------
-- locations: корпуса (campus) и общежития (dormitory)
-- ---------------------------------------------------------------------------
insert into public.locations (kind, name, address)
select v.kind::public.location_kind, v.name, v.address
from (values
  -- Учебные корпуса
  ('campus',     'Кронверкский, 49',   'Кронверкский пр., 49'),
  ('campus',     'Ломоносова, 9',      'Ломоносова ул., 9'),
  ('campus',     'Гривцова, 14/16',    'Гривцова пер., 14/16'),
  ('campus',     'Чайковского, 11',    'Чайковского ул., 11'),
  ('campus',     'Биржевая линия, 14/16', 'Биржевая линия, 14/16'),
  -- Общежития
  ('dormitory',  'Вяземский, 5/7',     'Вяземский пер., 5/7'),
  ('dormitory',  'Ленсовета, 23',      'Ленсовета ул., 23'),
  ('dormitory',  'Альпийский, 15',     'Альпийский пер., 15'),
  ('dormitory',  'Белорусская, 6',     'Белорусская ул., 6'),
  ('dormitory',  'ITMO Aparts',        null)
) as v(kind, name, address)
where not exists (
  select 1 from public.locations l where l.name = v.name
);

-- ---------------------------------------------------------------------------
-- routes: все пары «корпус ↔ общежитие» в обе стороны (основной сценарий)
-- ---------------------------------------------------------------------------
insert into public.routes (origin_id, destination_id)
select origin.id, dest.id
from public.locations origin
join public.locations dest
  on (origin.kind, dest.kind) in (('campus', 'dormitory'), ('dormitory', 'campus'))
on conflict (origin_id, destination_id) do nothing;
