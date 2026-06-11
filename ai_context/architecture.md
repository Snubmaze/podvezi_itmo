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

### 5.2 Схема базы данных (черновая, уточняется по ходу шага 2)

Все таблицы — с включённым RLS (`ENABLE ROW LEVEL SECURITY`) и явными
политиками доступа (см. `rules.md`).

#### `users`
Профиль пользователя (расширение identity, привязанной к Telegram).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | соответствует id записи аутентификации |
| telegram_id | bigint, unique | Telegram user id |
| telegram_username | text, nullable | @username в Telegram |
| full_name | text | ФИО (персональные данные, см. `rules.md`) |
| isu_number | text, unique, nullable | номер ИСУ (персональные данные) |
| itmo_id_status | text/enum | статус мок-верификации ITMO ID |
| role | text/enum | базовая роль: `passenger` \| `driver` \| `admin` |
| driver_verification_status | text/enum, nullable | см. ТЗ 5.3.1 |
| phone | text, nullable | контактный телефон (персональные данные) |
| avatar_url | text, nullable | URL аватара (Storage или Telegram) |
| created_at, updated_at | timestamptz | служебные поля |

#### `vehicles`
Автомобили водителей.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| driver_id | uuid (FK → users.id) | владелец |
| make | text | марка |
| model | text | модель |
| color | text | цвет |
| plate_number | text | гос. номер (персональные данные) |
| seats_count | int | число пассажирских мест |
| photo_url | text, nullable | фото автомобиля (Storage) |
| created_at, updated_at | timestamptz | |

#### `driver_documents`
Документы для верификации водителя.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| driver_id | uuid (FK → users.id) | |
| document_type | text/enum | тип документа (вод. удостоверение, СТС и т.п.) |
| file_url | text | путь в Supabase Storage (приватный bucket) |
| status | text/enum | `pending` \| `approved` \| `rejected` |
| reviewed_by | uuid (FK → users.id), nullable | админ, проверивший документ |
| reviewed_at | timestamptz, nullable | |
| created_at | timestamptz | |

#### `moderation_requests`
Заявки на модерацию (верификация водителя и пр.).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| requester_id | uuid (FK → users.id) | кто подал заявку |
| type | text/enum | например `driver_verification` |
| status | text/enum | `pending` \| `approved` \| `rejected` |
| payload | jsonb, nullable | дополнительные данные заявки |
| comment | text, nullable | комментарий модератора |
| reviewed_by | uuid (FK → users.id), nullable | |
| reviewed_at | timestamptz, nullable | |
| created_at | timestamptz | |

#### `campuses`
Справочник учебных корпусов ИТМО.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| name | text | название корпуса |
| address | text | адрес |
| latitude, longitude | numeric, nullable | координаты |
| created_at | timestamptz | |

#### `dormitories`
Справочник общежитий ИТМО.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| name | text | название общежития |
| address | text | адрес |
| latitude, longitude | numeric, nullable | координаты |
| created_at | timestamptz | |

#### `routes`
Маршруты между точками (campus/dormitory в любой комбинации).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| origin_type | text/enum | `campus` \| `dormitory` |
| origin_id | uuid | FK на `campuses.id` или `dormitories.id` (по `origin_type`) |
| destination_type | text/enum | `campus` \| `dormitory` |
| destination_id | uuid | FK на `campuses.id` или `dormitories.id` (по `destination_type`) |
| created_at | timestamptz | |

> Примечание: т.к. `origin_id`/`destination_id` ссылаются на разные
> таблицы в зависимости от `*_type`, классический FK constraint
> невозможен напрямую — потребуется либо проверка через триггер/CHECK +
> отдельные nullable FK-колонки (`origin_campus_id`,
> `origin_dormitory_id` и т.д.), либо unified-таблица "точек". Финальное
> решение принимается на шаге 2 (БД и Supabase) и фиксируется здесь.

#### `trips`
Поездки.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| driver_id | uuid (FK → users.id), nullable | nullable для "поездок без водителя" (release 2) |
| vehicle_id | uuid (FK → vehicles.id), nullable | |
| route_id | uuid (FK → routes.id) | |
| departure_time | timestamptz | время отправления |
| seats_total | int | всего мест |
| seats_available | int | свободно мест |
| price | numeric, nullable | стоимость места |
| status | text/enum | см. ТЗ 5.6 (например `planned` \| `active` \| `completed` \| `cancelled`) |
| comment | text, nullable | комментарий водителя |
| created_at, updated_at | timestamptz | |

#### `trip_members`
Подтверждённые участники поездки (водитель + пассажиры).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| trip_id | uuid (FK → trips.id) | |
| user_id | uuid (FK → users.id) | |
| role_in_trip | text/enum | `driver` \| `passenger` |
| status | text/enum | `confirmed` \| `cancelled` \| `completed` \| `no_show` |
| joined_at | timestamptz | |

#### `trip_requests`
Заявки пассажиров на участие в поездке (до подтверждения водителем).

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid (PK) | |
| trip_id | uuid (FK → trips.id) | |
| passenger_id | uuid (FK → users.id) | |
| status | text/enum | `pending` \| `accepted` \| `rejected` \| `cancelled` |
| message | text, nullable | сообщение от пассажира |
| created_at, updated_at | timestamptz | |

> Все enum'ы и точные наборы статусов (особенно "статус верификации
> водителя" из ТЗ 5.3.1 и "статус поездки" из ТЗ 5.6) должны быть
> зафиксированы как TypeScript union types/enums в `src/types/` и как
> Postgres enum/`CHECK` constraints в миграциях — единообразно. Если
> точные значения статусов не определены — уточнить у пользователя перед
> реализацией (шаг 2).

### 5.3 Storage

- Приватный bucket для документов водителей (`driver-documents`) — доступ
  только владельцу записи и администраторам (через RLS-политики Storage).
- Публичный/приватный bucket для фото автомобилей и аватаров —
  определяется на шаге 2.

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
