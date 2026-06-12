# Архитектура — "Попутчик ИТМО"

> Источник истины по технической архитектуре проекта. Любые изменения в
> технологиях, структуре папок или схеме БД должны сначала фиксироваться
> здесь (с обоснованием), и только потом реализовываться в коде.

## 1. Общий стек

| Слой      | Технологии |
|-----------|------------|
| Frontend  | React 19 + TypeScript (strict) + Vite + Tailwind CSS + shadcn/ui + Telegram Mini Apps SDK (`@telegram-apps/sdk-react`) |
| Backend   | Supabase (PostgreSQL, Auth, Storage, Realtime, Row Level Security) |
| Деплой    | Vercel (frontend), Supabase Cloud (backend) |

**Решение (зафиксировано на шаге 1):** отдельный backend-сервис
(Node/Express и т.п.) не используется. Вся серверная логика, упомянутая в
ТЗ как "backend API" (проверка подписи Telegram `initData` и выпуск
сессии, мок-проверка ITMO ID, серверная валидация при модерации и т.п.),
реализуется через:

- PostgreSQL + RLS + Database Functions/Triggers — где это возможно;
- **Supabase Edge Functions** (Deno) — для логики, требующей секретов
  (`TELEGRAM_BOT_TOKEN`, `SUPABASE_SECRET_KEY`) или вызовов внешних
  API.

Код Edge Functions размещается в `supabase/functions/` (появится на шаге
2/3). Если в ходе разработки выяснится, что Edge Functions недостаточно,
решение о введении отдельного backend-сервиса принимается совместно с
пользователем и фиксируется здесь.

## 2. Frontend — слои приложения

```
UI (components/screens)
   │  использует
   ▼
hooks (useXxx) — состояние экрана, бизнес-логика представления
   │  вызывает
   ▼
services/ — доменная логика (trips, users, vehicles, moderation...)
   │  использует
   ▼
api/ (или lib/supabase) — низкоуровневые обёртки над Supabase JS client
   │
   ▼
Supabase (PostgreSQL + Auth + Storage + Realtime, защищено RLS)
```

Правила взаимодействия слоёв:

- **Компоненты/экраны (UI)** не обращаются к Supabase напрямую. Они
  вызывают hooks или services.
- **hooks/** — React-хуки, инкапсулирующие состояние и side-effects
  конкретного экрана/фичи (например `useTrips`, `useDriverProfile`).
  Хуки вызывают функции из `services/`.
- **services/** — доменные модули с бизнес-логикой (валидация,
  преобразование данных, композиция нескольких запросов). Например
  `services/trips.ts`, `services/moderation.ts`.
- **api/** (`src/lib/supabase`) — единственное место, где создаётся и
  настраивается Supabase client, и где лежат типобезопасные обёртки над
  `supabase.from(...)`, `supabase.storage`, `supabase.auth`, `supabase
  .channel(...)` и т.д.
- **types/** — общие типы и enum'ы (статусы поездок, роли, статусы
  верификации водителя), сгенерированные/синхронизированные со схемой БД.

## 3. Структура папок проекта (frontend)

```
podvezi_app/
├── ai_context/              # контекст для AI-ассистента (этот каталог)
├── public/
├── src/
│   ├── app/                 # инициализация приложения: providers, роутинг
│   ├── components/          # переиспользуемые UI-компоненты (shadcn/ui + кастомные)
│   │   └── ui/               # базовые примитивы shadcn/ui (button, card, dialog...)
│   ├── pages/                # экраны приложения (роуты Mini App)
│   ├── hooks/                 # React-хуки с состоянием/бизнес-логикой экранов
│   ├── services/              # доменная логика поверх api/ (trips, users, vehicles...)
│   ├── api/                    # низкоуровневые обёртки над Supabase (alias: src/lib/supabase)
│   ├── types/                  # общие типы, enum'ы, статусы (синхронизированы с БД)
│   ├── lib/                     # утилиты, конфиг, telegram sdk init, supabase client
│   ├── styles/                  # глобальные стили, токены дизайн-системы (Tailwind theme)
│   └── main.tsx
├── supabase/
│   ├── migrations/            # SQL-миграции схемы БД
│   └── seed.sql                # сид-данные (campuses, dormitories, routes)
├── .env.example
├── CLAUDE.md
└── package.json
```

> Примечание: на шаге 1 создаётся только базовый каркас (`src/components`,
> `src/pages`, `src/services`, `src/hooks`, `src/types`, `src/lib`). Папки
> `app/`, `styles/`, `supabase/` будут наполняться по мере выполнения
> следующих шагов плана (`plan.md`).

## 4. Telegram Mini App интеграция

- Используется `@telegram-apps/sdk-react` (или совместимый SDK) для:
  - инициализации Mini App (`initData`, `initDataRaw`, `themeParams`,
    `viewport`, `BackButton`, `MainButton` и т.д.);
  - получения данных Telegram-пользователя (id, username, имя) для
    авторизации;
  - адаптации UI под тему Telegram (light/dark — см. шаг 10 плана).
- `initDataRaw` передаётся на backend (Supabase Edge Function или
  Database Function) для верификации подписи Telegram и выпуска
  Supabase-сессии (детали — шаг 3 плана, "Telegram-авторизация").

## 5. Backend — Supabase

### 5.1 Аутентификация (зафиксировано на шаге 3)

Базовая идентификация — через Telegram (`initData`), не email/password.
Выпуск Supabase-сессии — через **Edge Function + Admin API** (решение
пользователя на шаге 3):

1. Frontend получает `initDataRaw` из Telegram SDK и POST-ит его в Edge
   Function **`telegram-auth`** (`verify_jwt = false`).
2. Edge Function проверяет HMAC-SHA256 подпись `initData` секретом,
   производным от `TELEGRAM_BOT_TOKEN` (по алгоритму Telegram:
   `secret = HMAC_SHA256("WebAppData", bot_token)`), и срок годности
   (`auth_date`). Невалидная подпись → 401.
3. По `telegram_id` находит/создаёт пользователя в `auth.users` через
   Admin API. Учётка детерминированная: email
   `tg<telegram_id>@telegram.podvezi.local`, пароль = HMAC(серверный
   секрет `AUTH_USER_SECRET`, `telegram_id`) — известен только серверу.
4. Гарантирует строку в `public.users` (`id` = id auth-пользователя,
   `telegram_id`, `telegram_username`). Поля профиля (`full_name`, `course`,
   `age`, `avatar_url`, `isu_number`) на этом шаге не заполняются.
5. Серверно выполняет `signInWithPassword` и возвращает клиенту
   `{ access_token, refresh_token, is_new_user }`. Клиент вызывает
   `supabase.auth.setSession(...)`. Пароль клиенту не передаётся.

Секреты Edge Function (через `supabase secrets` / Management API):
`TELEGRAM_BOT_TOKEN`, `AUTH_USER_SECRET`, плюс автоматически доступные
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Безопасность (ТЗ 7.4): HTTPS,
JWT-сессия Supabase, доступ к данным только через RLS.

**Реализация по частям (шаг 3):** часть 3a — весь UI-флоу (экраны 6.1, 6.2,
мок-вход ITMO ID) на мок-провайдере авторизации (без Telegram/Supabase, для
разработки/демо); часть 3b — реальный `telegram-auth` Edge Function и
персистентность в Supabase за теми же интерфейсами (`services/auth.ts`).

#### Мок ITMO ID (заглушка, заменяемая на реальный SSO)

Реальная интеграция с ITMO ID/SSO (ТЗ 5.1) недоступна → заглушка за
интерфейсом `services/itmoId.ts` (`fetchItmoIdProfile(login, password)`):

- Любые непустые логин+пароль = успех (без внешнего запроса). Пустые поля —
  обычная клиентская валидация.
- Возвращает детерминированный мок-профиль (ФИО, `course`, `age`,
  `avatar_url`), выбираемый из 3–5 предопределённых профилей по хэшу
  логина → одинаковый логин всегда даёт одинаковые данные.
- Полученные поля сохраняются в `users`, выставляется `itmo_id_linked =
  true`. Точка замены на реальный ITMO ID — реализация этого интерфейса
  (ТЗ «Перспективы развития», п.16).

### 5.1.1 Роли, активная роль и верификация водителя (зафиксировано на шаге 4)

Уточнение пользователя (шаг 4): роль переключается на главном экране.

- **Активная роль — локальная (в памяти сессии), НЕ персистится.** На
  главном экране сверху переключатель из двух режимов:
  - **«Пассажир»** — доступен всегда (роль по умолчанию);
  - **«Водитель»** — изначально **заблокирован** (серый, с замком), пока
    `users.driver_verification_status` ≠ `approved`.
  `users.role` остаётся `passenger`; активная роль — лишь режим
  отображения UI.
- **Нажатие на заблокированного «Водителя»** открывает модалку, зависящую
  от `driver_verification_status`:
  - `none` / `rejected` → подача заявки на верификацию. **Полная форма
    (данные авто `vehicles` + загрузка фото ВУ/СТС в Storage +
    `moderation_requests`) — шаг 7.** На шаге 4 кнопка «Подать заявку» —
    UI-заглушка (статус не меняется).
  - `pending` → сообщение «Заявка на проверке».
  - `approved` → переключатель разблокирован; режим водителя (создание
    поездок — шаги 6/7).
- **Гейт прав водителя — по `driver_verification_status = approved`**, а
  не по `users.role` (роль локальна). Поэтому RLS `trips` на INSERT
  проверяет `approved`-статус (см. 5.2.1), без требования `role='driver'`.
- **Смену статуса на `approved`/`rejected` делает только администратор**
  (модерация, шаг 8). Пользователь может лишь подать/переподать заявку
  (`none`/`rejected` → `pending`). Закреплено триггером
  `guard_users_update` (5.2.1): обычный пользователь не может self-assign
  `role='admin'` и не может ставить себе `approved`/`rejected`.

### 5.2 Схема базы данных (финальная — зафиксирована на шаге 2)

Все таблицы — с включённым RLS (`ENABLE ROW LEVEL SECURITY`) и явными
политиками доступа (см. `rules.md` и раздел 5.2.1 ниже).

Реализация — версионированные SQL-миграции в `supabase/migrations/`
(применяются через Supabase Management API). Сидирование справочников —
`supabase/seed.sql`. Все enum'ы продублированы как TS union types в
`src/types/db.ts`.

#### Решения шага 2 (зафиксированы)

- **Единая таблица точек `locations`** (вместо отдельных `campuses` /
  `dormitories`). Тип точки задаётся колонкой `kind` (`campus` |
  `dormitory`). Причина: корпусов и общежитий немного, а единая таблица
  даёт настоящие FK из `routes`/`trips` (нет полиморфных ссылок),
  упрощает RLS и запросы. При необходимости «корпуса» / «общежития»
  отдаются через SQL-вью или фильтр по `kind`.
- **`trips` ссылается на точки напрямую** (`origin_id`, `destination_id`
  → `locations.id`), как в ТЗ («точка отправления / точка назначения»).
  `routes` остаётся справочником популярных/допустимых комбинаций точек
  (для фильтров и подсказок в UI); `trips.route_id` — необязательная
  ссылка.
- **Enum-статусы** реализованы как Postgres `enum`-типы + синхронные TS
  union types. Конкретные наборы значений зафиксированы ниже (п. 5.2.2).

#### Postgres enum-типы (5.2.2)

| Тип | Значения | Где используется |
|-----|----------|------------------|
| `user_role` | `passenger` \| `driver` \| `admin` | `users.role` |
| `driver_verification_status` | `none` \| `pending` \| `approved` \| `rejected` | `users.driver_verification_status` (`none` = заявка не подавалась) |
| `location_kind` | `campus` \| `dormitory` | `locations.kind` |
| `document_type` | `license` (ВУ) \| `sts` (СТС) | `driver_documents.document_type` |
| `document_status` | `pending` \| `approved` \| `rejected` | `driver_documents.status` |
| `moderation_type` | `driver_verification` | `moderation_requests.type` |
| `moderation_status` | `pending` \| `approved` \| `rejected` | `moderation_requests.status` |
| `trip_status` | `active` \| `completed` \| `cancelled` | `trips.status` |
| `trip_member_role` | `driver` \| `passenger` | `trip_members.role_in_trip` |
| `trip_member_status` | `confirmed` \| `cancelled` \| `completed` \| `no_show` | `trip_members.status` |
| `trip_request_status` | `pending` \| `accepted` \| `rejected` \| `cancelled` | `trip_requests.status` |

> Примечание по release 2 («поездки без водителя», шаг 9 плана): в части 2
> промтов для них упомянут отдельный набор статусов («Ожидает
> пассажиров» / «Подтверждена» / «Завершена» / «Отменена»). В текущей
> схеме `trip_requests` — это **заявки пассажира на присоединение к
> поездке** (как в исходной архитектуре). Сценарий release 2 будет
> domodelироваться на шаге 9 (вероятно через `trips` с `driver_id = NULL`
> и расширение `trip_status`); решение зафиксируется здесь тогда же.

#### `users`
Профиль пользователя (расширение identity, привязанной к Telegram).
`id` = `auth.users.id` (Supabase Auth, заполняется на шаге 3).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK, FK → auth.users) | соответствует id записи аутентификации |
| telegram_id | bigint, unique, not null | Telegram user id |
| telegram_username | text, nullable | @username в Telegram |
| full_name | text, nullable | ФИО (ПД; приходит из мок ITMO ID, см. шаг 3) |
| isu_number | text, unique, nullable | номер ИСУ (ПД) |
| itmo_id_linked | boolean, not null, default false | пройден ли мок-вход через ITMO ID |
| course | smallint, nullable | курс (из ITMO ID) |
| age | smallint, nullable | возраст (из ITMO ID) |
| description | text, nullable | описание профиля (ТЗ 5.8, редактируемое) |
| role | user_role, not null, default `passenger` | базовая роль |
| driver_verification_status | driver_verification_status, not null, default `none` | статус верификации водителя (ТЗ 5.3.1) |
| phone | text, nullable | контактный телефон (ПД) |
| avatar_url | text, nullable | URL аватара (мок ITMO ID / Telegram / Storage) |
| created_at, updated_at | timestamptz | служебные поля |

#### `locations`
Единый справочник точек маршрутов (корпуса и общежития ИТМО).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| kind | location_kind, not null | `campus` \| `dormitory` |
| name | text, not null | человекочитаемое название |
| address | text, nullable | адрес (может быть не задан, напр. ITMO Aparts) |
| latitude, longitude | numeric, nullable | координаты |
| is_active | boolean, not null, default true | показывать ли в выборе |
| created_at | timestamptz | |

#### `vehicles`
Автомобили водителей.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| driver_id | uuid (FK → users.id), not null | владелец |
| make | text, not null | марка |
| model | text, not null | модель |
| color | text, nullable | цвет |
| plate_number | text, not null | гос. номер (персональные данные) |
| seats_count | smallint, not null (1..8) | число пассажирских мест |
| photo_url | text, nullable | фото автомобиля (Storage) |
| created_at, updated_at | timestamptz | |

#### `driver_documents`
Документы для верификации водителя.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| driver_id | uuid (FK → users.id), not null | |
| document_type | document_type | `license` (ВУ) \| `sts` (СТС) |
| file_path | text, not null | путь в приватном Storage-bucket `driver-documents` |
| status | document_status, default `pending` | `pending` \| `approved` \| `rejected` |
| comment | text, nullable | комментарий модератора |
| reviewed_by | uuid (FK → users.id), nullable | админ, проверивший документ |
| reviewed_at | timestamptz, nullable | |
| created_at | timestamptz | |

#### `moderation_requests`
Заявки на модерацию (верификация водителя и пр.) — история решений админа.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| requester_id | uuid (FK → users.id), not null | кто подал заявку |
| type | moderation_type, default `driver_verification` | тип заявки |
| status | moderation_status, default `pending` | `pending` \| `approved` \| `rejected` |
| payload | jsonb, nullable | дополнительные данные заявки |
| comment | text, nullable | комментарий модератора |
| reviewed_by | uuid (FK → users.id), nullable | |
| reviewed_at | timestamptz, nullable | |
| created_at | timestamptz | |

> Справочники точек — единая таблица `locations` (см. выше, раздел
> «Решения шага 2»). Отдельных таблиц `campuses` / `dormitories` нет.

#### `routes`
Справочник допустимых/популярных комбинаций точек (для фильтров и
подсказок в UI). Обе ссылки — настоящие FK на `locations`.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| origin_id | uuid (FK → locations.id), not null | точка отправления |
| destination_id | uuid (FK → locations.id), not null | точка назначения |
| is_active | boolean, default true | |
| created_at | timestamptz | |
| | CHECK | `origin_id <> destination_id`; UNIQUE(origin_id, destination_id) |

#### 5.2.3 Валидация маршрута (зафиксировано на шаге 5)

Решение пользователя: выбор точки отправления/назначения (ТЗ 5.5.1)
ограничен только справочником `locations` (никакого свободного ввода адреса
— ТЗ 5.5.2). Любая пара **различных активных** точек `locations` допустима
— `routes` НЕ используется как ограничение при создании/поиске поездки,
только как справочник «популярных» комбинаций для будущих подсказок/
сортировки в UI (сейчас не реализовано). Валидация (`origin_id <>
destination_id`, обе точки выбраны) — на клиенте
(`services/locations.ts#validateRoutePair`) и на уровне БД (`CHECK` на
`trips`/`routes`).

**RLS:** `locations`/`routes` — справочники без персональных данных, SELECT
открыт для `anon` и `authenticated` (миграция
`20260611140000_locations_routes_anon_select.sql`). Причина: в dev-режиме
(вне Telegram) активен мок-бэкенд авторизации (`services/auth.ts`) без
реальной Supabase-сессии — запросы идут как `anon`, и без этой политики
справочник точек был бы пуст.

#### `trips`
Поездки. Точки отправления/назначения хранятся напрямую (FK на
`locations`); `route_id` — необязательная привязка к справочнику.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| driver_id | uuid (FK → users.id), nullable | nullable для "поездок без водителя" (release 2) |
| vehicle_id | uuid (FK → vehicles.id), nullable | |
| origin_id | uuid (FK → locations.id), not null | точка отправления |
| destination_id | uuid (FK → locations.id), not null | точка назначения |
| route_id | uuid (FK → routes.id), nullable | необязательная ссылка на справочник маршрутов |
| departure_time | timestamptz, not null | время отправления |
| seats_total | smallint, not null (1..8) | всего мест |
| seats_available | smallint, not null (>=0, <=seats_total) | свободно мест |
| price | numeric(10,2), nullable | стоимость места |
| status | trip_status, default `active` | `active` \| `completed` \| `cancelled` |
| comment | text, nullable | комментарий водителя |
| created_at, updated_at | timestamptz | |
| | CHECK | `origin_id <> destination_id` |

#### `trip_members`
Подтверждённые участники поездки (водитель + пассажиры).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| trip_id | uuid (FK → trips.id) | |
| user_id | uuid (FK → users.id) | |
| role_in_trip | trip_member_role | `driver` \| `passenger` |
| status | trip_member_status, default `confirmed` | `confirmed` \| `cancelled` \| `completed` \| `no_show` |
| joined_at | timestamptz | |
| | UNIQUE | (trip_id, user_id) |

#### `trip_requests`
Заявки пассажиров на участие в поездке (до подтверждения водителем).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| trip_id | uuid (FK → trips.id) | |
| passenger_id | uuid (FK → users.id) | |
| status | trip_request_status, default `pending` | `pending` \| `accepted` \| `rejected` \| `cancelled` |
| message | text, nullable | сообщение от пассажира |
| created_at, updated_at | timestamptz | |
| | UNIQUE | (trip_id, passenger_id) |

#### 5.2.1 RLS — модель доступа (кратко)

Вспомогательная функция `public.is_admin()` (SECURITY DEFINER) — проверка
роли `admin` без рекурсии RLS. Сводка политик:

- `users` — SELECT/UPDATE своей строки (`id = auth.uid()`) или админ;
  INSERT своей строки; DELETE только админ. Привилегированные поля
  защищены триггером **`guard_users_update`** (BEFORE UPDATE): обычный
  пользователь не может self-assign `role='admin'` и не может ставить себе
  `driver_verification_status` в `approved`/`rejected` (допускается лишь
  `none`/`rejected` → `pending` — подача заявки). Серверные контексты
  (`service_role` / админ / отсутствие `auth.uid()`) — без ограничений.
- `locations`, `routes` — SELECT всем, включая анонимных (`anon`,
  `authenticated`) — справочник без персональных данных, нужен в dev-режиме
  без Telegram-сессии (см. 5.2.3); запись только админ.
- `vehicles` — владелец (`driver_id = auth.uid()`) или админ.
- `driver_documents` — ПД: SELECT/INSERT/DELETE владелец или админ;
  UPDATE (смена статуса) — только админ.
- `moderation_requests` — SELECT заявитель или админ; INSERT свои;
  UPDATE только админ.
- `trips` — SELECT всем аутентифицированным; INSERT только
  верифицированный водитель (`driver_id = auth.uid()` и
  `driver_verification_status = approved`; роль НЕ требуется, т.к.
  активная роль локальна — см. 5.1.1); UPDATE/DELETE владелец или админ.
- `trip_members` — SELECT участник / водитель поездки / админ; запись —
  водитель поездки или админ (плюс участник может отменить своё участие).
- `trip_requests` — SELECT пассажир / водитель поездки / админ; INSERT
  пассажир (свои); UPDATE пассажир (отмена) / водитель (accept/reject) /
  админ.

**`trip_requests` — guard-триггер и атомарное подтверждение (шаг 6):**
RLS на `trip_requests` не может проверить состояние связанной поездки, поэтому
добавлен BEFORE INSERT триггер `guard_trip_requests_insert()`: блокирует заявку
на несуществующую/неактивную поездку и заявку водителя на свою же поездку
(понятные ошибки на русском, всплывают в `services/trips.ts#joinTrip` через
`error.code === 'P0001'`). Подтверждение заявки водителем — три записи
(`trip_requests.status='accepted'`, `insert trip_members`,
`trips.seats_available--`) атомарны через RPC-функцию
`accept_trip_request(p_request_id uuid)`, `SECURITY INVOKER` (каждая запись и
так разрешена RLS водителю поездки/админу — лишних прав не требуется).
Отклонение/отмена заявки — обычные `UPDATE`/`DELETE` под существующими RLS, без
RPC. Если пассажиру отклонили/он отменил заявку — повторная заявка на ту же
поездку невозможна (`UNIQUE(trip_id, passenger_id)`), это осознанное решение
пользователя на шаге 6.

#### `user_public_profiles` — безопасный публичный профиль (шаг 6)

Для отображения имени/аватара водителя и пассажиров в списках поездок (без
`isu_number`/`phone`/`role`) добавлена SQL-вью:

```sql
create view public.user_public_profiles as
select id, full_name, avatar_url, course
from public.users;

grant select on public.user_public_profiles to anon, authenticated;
```

Работает за счёт дефолтного `security_invoker = false` для view (PostgreSQL
15+): вью выполняется с правами владельца (роль миграции), который не
ограничен RLS на `public.users`, т.к. на `users` не включён `FORCE ROW LEVEL
SECURITY`. Наружу отдаются только 4 безопасных поля.

> ⚠️ Если в будущем на `users` включат `FORCE ROW LEVEL SECURITY` — эта вью
> перестанет отдавать чужие профили (будет видеть только свою строку), и её
> нужно будет пересмотреть (например, переписать на `SECURITY DEFINER`
> функцию).

### 5.3 Storage

- **`driver-documents`** — приватный bucket (создан на шаге 2). Доступ по
  RLS-политикам `storage.objects`: путь файла начинается с `<user_id>/...`;
  INSERT/SELECT/UPDATE/DELETE — только владелец (`(storage.foldername
  (name))[1] = auth.uid()::text`) или админ (`is_admin()`).
- Bucket для фото автомобилей и аватаров — будет добавлен на шаге 7
  (регистрация водителя / `vehicles.photo_url`). Аватары из мок ITMO ID
  приходят внешним URL и в Storage пока не хранятся.

### 5.4 Realtime

- Таблицы `trips`, `trip_requests`, `trip_members` добавлены в публикацию
  `supabase_realtime` (миграция `20260611150100_realtime_publication.sql`,
  шаг 6). Realtime уважает RLS: для `trips` (SELECT всем authenticated)
  изменения видят все, для `trip_requests`/`trip_members` — только
  участник/водитель поездки/админ. Хуки `useTripSearch`,
  `useMyDriverTrips`, `useMyPassengerTrips` подписываются через
  `supabase.channel(...).on('postgres_changes', { event: '*', schema:
  'public', table: '...' }, () => refetch())` и делают полный refetch (без
  точечного патчинга состояния).

### 5.5 Сервисный контракт поездок (`src/services/trips.ts`, шаг 6)

Все функции — `async`, при ошибке `throw new Error('сообщение по-русски')`.
Композитные типы — `src/types/trips.ts`.

| Функция | Сигнатура | Описание |
|---|---|---|
| `createTrip` | `(driverId: string, input: CreateTripInput) => Promise<Trip>` | Создаёт поездку (`status='active'`, `seats_available = seats_total`, `vehicle_id = null`). Валидация: маршрут (`validateRoutePair`), `seatsTotal` 1..8, `price` ≥ 0 или `null`, `departureTime` в будущем. |
| `searchTrips` | `(filters: TripSearchFilters, excludeDriverId?: string) => Promise<TripWithRoute[]>` | Активные поездки с фильтрами по точкам/дате/времени (ТЗ 5.7). `excludeDriverId` исключает поездки этого водителя (пассажир не видит свои же поездки в поиске). Возвращает с развёрнутыми `origin`/`destination`/`driver`. |
| `getMyDriverTrips` | `(driverId: string) => Promise<DriverTripWithDetails[]>` | Поездки водителя с заявками (`pending`) и подтверждёнными участниками (`confirmed`), для «Мои поездки» (вид водителя). |
| `getMyPassengerTrips` | `(passengerId: string) => Promise<TripRequestWithTrip[]>` | Заявки пассажира с развёрнутой поездкой и профилем водителя, для «Мои поездки» (вид пассажира). |
| `joinTrip` | `(passengerId: string, tripId: string) => Promise<TripRequest>` | Создаёт заявку (`status='pending'`). Ошибки: `23505` → «Вы уже подавали заявку на эту поездку»; `P0001` (guard-триггер) → текст из БД; иначе — общая ошибка. |
| `acceptTripRequest` | `(requestId: string) => Promise<void>` | RPC `accept_trip_request` — атомарно принимает заявку, создаёт `trip_members`, уменьшает `seats_available`. |
| `rejectTripRequest` | `(requestId: string) => Promise<void>` | `UPDATE trip_requests SET status='rejected' WHERE id=... AND status='pending'`. |
| `cancelTripRequest` | `(requestId: string) => Promise<void>` | `DELETE FROM trip_requests WHERE id=... AND status='pending'` (отмена своей заявки пассажиром). |
| `getCoTravelerContact` | `(userId: string) => Promise<CoTravelerContact \| null>` | RPC `get_co_traveler_contact` — профиль с контактами, доступен только подтверждённому попутчику (ТЗ 5.5.1); иначе `null`. |
| `getPublicProfile` | `(userId: string) => Promise<UserPublicProfile \| null>` | Одиночный публичный профиль из вью `user_public_profiles` (без контактов) — фолбэк для экрана профиля водителя, когда контакты недоступны. |

Отложено (вне рамок шага 6): отмена уже подтверждённого участия
(`trip_members`, `status='cancelled'`), работа с `vehicle_id` (шаг 7),
«поездки без водителя» (`driver_id = null`, шаг 9).

### 5.6 Заявка и верификация водителя (`src/services/driver.ts`, шаг 7)

Без новых таблиц/миграций — используются существующие `vehicles`,
`driver_documents`, `moderation_requests`, приватный bucket
`driver-documents` и их RLS (5.2.1/5.3).

**Подача заявки** (экран `DriverRegistrationScreen`, ТЗ 6.4) —
`submitDriverVerification(userId, input)`:

1. Загрузка 4 фото (ВУ лицевая/задняя, СТС лицевая/задняя) в
   `driver-documents` по пути `<userId>/<license|sts>/<front|back>_<ts>.<ext>`
   (RLS: первый сегмент = `auth.uid()`; сторона документа — в имени файла).
2. `insert vehicles` (make, model, plate_number, **color обязателен**,
   seats_count).
3. `insert driver_documents` ×4 (по 2 на `license`/`sts`, `status='pending'`,
   `file_path` с указанием стороны). `document_type` остаётся
   `license`/`sts` (без новых значений enum).
4. `insert moderation_requests` (`type='driver_verification'`,
   `status='pending'`, `payload={vehicle_id}`).
5. `update users.driver_verification_status = 'pending'` (разрешено
   триггером `guard_users_update`: `none`/`rejected` → `pending`).

Операция не транзакционна (Storage + несколько INSERT); при ошибке на
позднем шаге возможны «осиротевшие» строки/файлы — допустимо для MVP,
полноценная атомарность (RPC) — возможное улучшение.

**Мок-режим** (браузер без Telegram): реальные записи невозможны (нет
Supabase-сессии, RLS), поэтому `submitDriverVerification` только
выставляет статус мок-пользователя в `pending` (`devSetMockDriverStatus`)
— чтобы прокликать флоу локально.

**Статус модерации** (ТЗ 6.5) показывается без отдельного экрана:
`DriverVerificationModal` (по тапу на заблокированного «Водителя») —
`pending`/`approved`/`rejected`; на экране профиля (6.9) при `rejected`
показывается причина из последней заявки
(`getDriverApplication(userId)` → `moderation_requests.comment`, заполняет
админ на шаге 8). Блокировка функций водителя до `approved` — уже
реализована (RoleSwitcher + RLS `trips`, см. 5.1.1).

**Обновление профиля после подачи** — провайдер авторизации получает
действие `reloadUser()` (перечитывает `User` из активного `AuthBackend`),
чтобы UI сразу отразил `pending`.

> `vehicles.photo_url` и связь `trips.vehicle_id` с созданным авто — пока
> не используются (возможное улучшение); `trips.vehicle_id` остаётся
> `NULL` (см. 5.5).

### 5.7 Админ-модерация (`src/services/moderation.ts`, шаг 8)

Без новых таблиц/миграций — на существующих `moderation_requests`/
`driver_documents`/`vehicles`/`users` и их RLS (только `is_admin()`).

- `getPendingDriverApplications()` — заявки `moderation_requests`
  (`type='driver_verification'`, `status='pending'`) с встроенным профилем
  заявителя (`users!requester_id`), авто (`vehicles` по `payload.vehicle_id`)
  и документами (`driver_documents` по `driver_id`); для фото — подписанные
  ссылки `storage.createSignedUrls(paths, 1ч)` (приватный bucket).
- `approveDriverApplication(requestId, applicantId)` — `moderation_requests`
  → `approved` (+`reviewed_by`/`reviewed_at`), `users.driver_verification_status`
  → `approved`, `driver_documents` → `approved`.
- `rejectDriverApplication(requestId, applicantId, reason)` — то же с
  `rejected` и `comment=reason` (причина видна заявителю на профиле 6.9 через
  `getDriverApplication`).

**Доступ:** UI (`AdminModerationScreen`) показывается только при
`users.role='admin'`. Жёсткое ограничение — RLS: чтение/запись
`moderation_requests`/`driver_documents` и чужих `users`/`vehicles`
требует `is_admin()`; смену `driver_verification_status` обычному
пользователю запрещает триггер `guard_users_update` (проверено на шаге 4).
Назначение админа — `update users set role='admin'` в БД (через SQL Editor).

**Блокировка пользователей** (ТЗ 4.4) — отложена (нет поля `users.is_blocked`);
будет добавлена отдельным подшагом (миграция + enforcement).

**Мок-режим** (браузер): реальных заявок/админа нет — `services/moderation.ts`
отдаёт демо-заявки из памяти (approve/reject убирают их из списка); роль
`admin` включается dev-кнопкой профиля (`devSetMockRole`). Это только для
локальной проверки UI.

## 6. Деплой

- **Frontend**: статическая сборка (`npm run build`, Vite) на VPS
  (`186.246.14.187`), раздаётся nginx с HTTPS (Let's Encrypt) по адресу
  `https://ap2-409371.lab-itmo.ru/`. Корень nginx-конфига
  `/etc/nginx/sites-available/ap2-409371.lab-itmo.ru` указывает на
  `/var/www/ap2-409371.lab-itmo.ru/` = содержимое `dist/`.
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — при пуше в
  `main` собирает фронтенд (`npm ci && npm run build` с `VITE_*` из GitHub
  Secrets) и заливает `dist/` по rsync через SSH на сервер от имени
  отдельного непривилегированного пользователя `deploy` (владеет
  `/var/www/ap2-409371.lab-itmo.ru`, ключ только для CI). Требуемые
  репозиторные secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_TELEGRAM_BOT_USERNAME`, `DEPLOY_HOST`, `DEPLOY_USER`,
  `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.
- **Backend**: Supabase Cloud-проект (БД, Auth, Storage, Realtime, Edge
  Functions при необходимости).

## 7. Журнал изменений архитектуры

| Дата | Изменение | Причина |
|------|-----------|---------|
| 2026-06-11 | Первая версия документа (шаг 1: инициализация) | Старт проекта |
| 2026-06-11 | Зафиксирован выбор "серверная логика — через Supabase Edge Functions, без отдельного backend-сервиса" | Решение пользователя на шаге 1 |
| 2026-06-11 | Шаг 2: финальная схема БД. Единая таблица `locations` (kind) вместо `campuses`/`dormitories`; `trips` ссылается на точки напрямую; `routes` — справочник комбинаций; зафиксированы enum-статусы и RLS-модель (5.2.1) | Решение пользователя на шаге 2 (мало точек → единая таблица) |
| 2026-06-11 | Шаг 2: миграции применяются через Supabase Management API (нет локального CLI/пароля БД); создан приватный Storage bucket `driver-documents` | Решение пользователя на шаге 2 |
| 2026-06-11 | Шаг 3: auth-сессия из Telegram initData — через Edge Function `telegram-auth` + Admin API (детерминированные email/пароль по telegram_id); мок ITMO ID за интерфейсом `services/itmoId.ts`. Функция задеплоена через Management API, секреты `TELEGRAM_BOT_TOKEN`/`AUTH_USER_SECRET` заданы | Решение пользователя на шаге 3 |
| 2026-06-11 | Шаг 4: активная роль — локальная (не персистится, см. 5.1.1); гейт прав водителя по `driver_verification_status=approved` (изменён RLS `trips` INSERT, убрано требование роли); добавлен триггер `guard_users_update` против self-escalation | Уточнение пользователя на шаге 4 |
| 2026-06-11 | Шаг 5: валидация маршрута (5.2.3) — допустима любая пара различных активных `locations`; `routes` не используется как ограничение, остаётся справочником «популярных» комбинаций для будущих подсказок | Решение пользователя на шаге 5 |
| 2026-06-11 | Шаг 5 (фикс): RLS `locations`/`routes` SELECT открыт также для `anon` (не ПД, нужно для dev-режима без Telegram-сессии) | Решение пользователя на шаге 5 |
| 2026-06-11 | Шаг 6: вью `user_public_profiles` (5.2); guard-триггер `guard_trip_requests_insert` и RPC `accept_trip_request` на `trip_requests`/`trips`/`trip_members` (5.2.1); `trips`/`trip_members`/`trip_requests` добавлены в `supabase_realtime` (5.4); зафиксирован сервисный контракт `services/trips.ts` (5.5). Заявки пассажира идут через апрув водителя (`trip_requests` → `trip_members`), повторная заявка после отклонения/отмены заблокирована навсегда (`UNIQUE`) | Решение пользователя на шаге 6 |
| 2026-06-11 | Шаг 7: верификация водителя (5.6) на существующих таблицах без новых миграций — `services/driver.ts` (`submitDriverVerification`/`getDriverApplication`), экран `DriverRegistrationScreen`, действие провайдера `reloadUser()`. Статус модерации — в модалке/профиле (без отдельного экрана). Мок-режим: запись имитируется (`pending`) | Реализация шага 7 |
| 2026-06-11 | Шаг 8: админ-модерация (5.7) на существующих таблицах/RLS без миграций — `services/moderation.ts`, `AdminModerationScreen`, signed-URL на документы. Блокировка пользователей отложена (по решению пользователя); тест админки локально — dev-роль + мок-заявки | Решение пользователя на шаге 8 |
| 2026-06-12 | Деплой фронтенда перенесён с Vercel на VPS (nginx + Let's Encrypt, `https://ap2-409371.lab-itmo.ru/`), добавлен CI/CD через GitHub Actions (rsync по SSH под пользователем `deploy`) | Нужен реальный HTTPS-хост для тестирования Telegram Mini App; автодеплой при пуше в `main` |
