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

### 5.1 Аутентификация

- Базовая идентификация — через Telegram (`initData`), не email/password.
- Подход к выпуску Supabase-сессии (custom JWT / Supabase Auth с кастомным
  провайдером / анонимная сессия + привязка telegram_id) уточняется и
  фиксируется на шаге 3 плана.
- Дополнительно при первой регистрации пользователь вводит номер ИСУ;
  предусмотрена мок-проверка ITMO ID (реальная интеграция с ITMO ID —
  вне рамок текущего этапа, реализуется как заглушка/мок).

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
  (`role`, `driver_verification_status`, поля из ITMO ID) меняются на
  серверном слое (Edge Function / админ), не пользователем напрямую.
- `locations`, `routes` — SELECT всем аутентифицированным; запись только
  админ.
- `vehicles` — владелец (`driver_id = auth.uid()`) или админ.
- `driver_documents` — ПД: SELECT/INSERT/DELETE владелец или админ;
  UPDATE (смена статуса) — только админ.
- `moderation_requests` — SELECT заявитель или админ; INSERT свои;
  UPDATE только админ.
- `trips` — SELECT всем аутентифицированным; INSERT только
  верифицированный водитель (`role in (driver, admin)` и
  `driver_verification_status = approved`); UPDATE/DELETE владелец или
  админ.
- `trip_members` — SELECT участник / водитель поездки / админ; запись —
  водитель поездки или админ (плюс участник может отменить своё участие).
- `trip_requests` — SELECT пассажир / водитель поездки / админ; INSERT
  пассажир (свои); UPDATE пассажир (отмена) / водитель (accept/reject) /
  админ.

> Профиль другого пользователя (для отображения имени/аватара водителя в
> списке поездок) при необходимости отдаётся через отдельную SQL-вью с
> безопасным набором полей (без `isu_number` / `phone`) — добавляется на
> шаге, где это потребуется (6). Сейчас RLS на `users` — строгий.

### 5.3 Storage

- **`driver-documents`** — приватный bucket (создан на шаге 2). Доступ по
  RLS-политикам `storage.objects`: путь файла начинается с `<user_id>/...`;
  INSERT/SELECT/UPDATE/DELETE — только владелец (`(storage.foldername
  (name))[1] = auth.uid()::text`) или админ (`is_admin()`).
- Bucket для фото автомобилей и аватаров — будет добавлен на шаге 7
  (регистрация водителя / `vehicles.photo_url`). Аватары из мок ITMO ID
  приходят внешним URL и в Storage пока не хранятся.

### 5.4 Realtime

- Таблицы `trips`, `trip_requests`, `trip_members` — кандидаты на
  Supabase Realtime подписки (обновление списка поездок/заявок в
  реальном времени).

## 6. Деплой

- **Frontend**: Vercel, сборка через Vite (`npm run build`), переменные
  окружения (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_TELEGRAM_BOT_USERNAME` и т.п.) настраиваются в Vercel Project
  Settings — не коммитятся.
- **Backend**: Supabase Cloud-проект (БД, Auth, Storage, Realtime, Edge
  Functions при необходимости).

## 7. Журнал изменений архитектуры

| Дата | Изменение | Причина |
|------|-----------|---------|
| 2026-06-11 | Первая версия документа (шаг 1: инициализация) | Старт проекта |
| 2026-06-11 | Зафиксирован выбор "серверная логика — через Supabase Edge Functions, без отдельного backend-сервиса" | Решение пользователя на шаге 1 |
| 2026-06-11 | Шаг 2: финальная схема БД. Единая таблица `locations` (kind) вместо `campuses`/`dormitories`; `trips` ссылается на точки напрямую; `routes` — справочник комбинаций; зафиксированы enum-статусы и RLS-модель (5.2.1) | Решение пользователя на шаге 2 (мало точек → единая таблица) |
| 2026-06-11 | Шаг 2: миграции применяются через Supabase Management API (нет локального CLI/пароля БД); создан приватный Storage bucket `driver-documents` | Решение пользователя на шаге 2 |
