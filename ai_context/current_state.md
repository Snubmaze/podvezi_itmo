# Текущее состояние проекта — "Попутчик ИТМО"

> Обновляется после завершения каждого шага из `plan.md`.

## Шаг 1. Инициализация — выполнено

Дата: 2026-06-11.

### Что сделано

- Создан каталог `ai_context/` с файлами `goal.md`, `architecture.md`,
  `current_state.md` (этот файл), `rules.md`, `plan.md`,
  `design_system.md` (заглушка — ждём дизайн-систему от пользователя).
- Создан корневой `CLAUDE.md` с инструкциями по работе с `ai_context/`.
- Инициализирован проект **Vite + React 19 + TypeScript (strict)**.
- Подключены и настроены:
  - **Tailwind CSS v4** (через `@tailwindcss/vite`);
  - **shadcn/ui** (`components.json`, базовый компонент `Button`,
    `src/lib/utils.ts`, тема в `src/index.css` — нейтральная палитра по
    умолчанию, light/dark через `oklch`-токены);
  - **Telegram Mini Apps SDK** (`@telegram-apps/sdk-react`) —
    `src/lib/telegram.ts` с функцией `initTelegramSdk()` (no-op вне
    Telegram), вызывается в `src/main.tsx`;
  - **Supabase JS client** (`@supabase/supabase-js`) —
    `src/lib/supabase.ts`, читает `VITE_SUPABASE_URL` /
    `VITE_SUPABASE_ANON_KEY` из переменных окружения и бросает ошибку,
    если они не заданы.
- Настроен alias `@/*` → `src/*` (tsconfig + vite.config.ts).
- Создана базовая структура папок: `src/components` (включая
  `src/components/ui` от shadcn), `src/pages`, `src/services`,
  `src/hooks`, `src/types`, `src/lib`.
- `src/App.tsx` заменён на минимальную заглушку (заголовок проекта +
  отключённая кнопка) — без бизнес-логики и реальных экранов.
- Создан `.env.example` (плейсхолдеры для Supabase URL/anon key/service
  role key, Telegram Bot Token, username бота).
- `.gitignore` дополнен правилами для `.env*` (с исключением
  `.env.example`).
- Исправлена уязвимость high severity в транзитивной зависимости
  `valibot` (через `overrides` в `package.json`, без даунгрейда
  `@telegram-apps/sdk-react`).
- Добавлен ESLint override для `src/components/ui/**` (правило
  `react-refresh/only-export-components` отключено для vendored
  shadcn-компонентов, которые экспортируют variant-хелперы).
- Проверено: `npm run lint` и `npm run build` проходят без ошибок,
  `npm run dev` поднимает dev-сервер и отдаёт страницу (200 OK).

### Что НЕ сделано (намеренно, по объёму этого шага)

- Нет подключения к реальному Supabase-проекту (см. ниже — проект ещё не
  создан).
- Нет миграций БД, схемы таблиц, RLS-политик (шаг 2).
- Нет авторизации через Telegram, регистрации, ролей и экранов (шаги 3-4
  и далее).
- Дизайн-система не наполнена (`design_system.md` — заглушка, ждём
  контент от пользователя).

## Ответы пользователя по итогам шага 1 (2026-06-11)

- **Backend**: серверная логика — через Supabase Edge Functions (без
  отдельного сервиса). Зафиксировано в `architecture.md`.
- **Git**: репозиторий инициализирован, сделан первый коммит.
- **Telegram-бот**: создан `.env` (не в git) с `TELEGRAM_BOT_TOKEN` и
  `VITE_TELEGRAM_BOT_USERNAME=podvezi_itmo_bot`. Поля Supabase в `.env`
  пока пустые.
- **Supabase**: проект ещё не создан пользователем — блокирует старт шага 2.
- **Дизайн-система**: пока не готова, `design_system.md` остаётся
  заглушкой.
- **Статусы из ТЗ 5.3.1/5.6** (верификация водителя, статус поездки):
  точный текст ТЗ не предоставлен. Пользователь разрешил спроектировать
  enum'ы самостоятельно по ходу соответствующих шагов (3/6/7), выбирая
  простые и достаточные значения, и фиксировать их в `architecture.md` /
  `src/types/` при появлении.

### Сырые данные для шага 2 — список адресов ИТМО (от пользователя)

Адреса предоставлены пользователем для справочников `campuses` /
`dormitories`. Деление на корпуса/общежития и координаты — уточнить и
зафиксировать на шаге 2 (часть адресов общеизвестна, но финальную
классификацию должен подтвердить пользователь):

- Кронверский пр., 49
- Ломоносова ул., 9
- Вяземский пер., 5/7
- Ленсовета ул., 23
- Альпинский пер., 15
- Белорусская ул., 6
- Гривцова пер., 14/16
- Чайковского ул., 11
- Биржевая линия, 14/16

## Supabase-проект (2026-06-11)

Пользователь создал проект через дашборд supabase.com:

- `VITE_SUPABASE_URL` — заполнен в `.env`.
- `SUPABASE_SECRET_KEY` (новый формат ключей Supabase, `sb_secret_...`) —
  заполнен в `.env`, используется ТОЛЬКО для серверных операций
  (Edge Functions), не для frontend.
- `VITE_SUPABASE_ANON_KEY` — заполнен (`sb_publishable_...`).
- Подключение проверено: `auth/v1/health` -> 200, `rest/v1/<table>` ->
  404 (таблиц пока нет — ожидаемо).

Все секреты лежат только в `.env` (не в git).

## Шаг 2. БД и Supabase — выполнено

Дата: 2026-06-11.

### Решения по схеме (зафиксированы в `architecture.md` 5.2)

- **Единая таблица `locations`** (`kind` = `campus` | `dormitory`) вместо
  отдельных `campuses`/`dormitories` — по решению пользователя (точек
  мало → проще RLS и настоящие FK). `trips`/`routes` ссылаются на
  `locations` напрямую.
- `trips` хранит `origin_id`/`destination_id` напрямую; `routes` —
  справочник популярных комбинаций (`trips.route_id` необязателен).
- Зафиксированы 11 enum-типов (роли, статусы верификации/документов/
  модерации/поездок/участников/заявок) — см. `architecture.md` 5.2.2 и
  `src/types/db.ts`.
- Статусы release 2 («поездки без водителя») отложены на шаг 9 (заметка в
  `architecture.md`).

### Что сделано

- Созданы миграции в `supabase/migrations/`:
  - `20260611120000_schema.sql` — расширение `pgcrypto`, 11 enum-типов,
    функция-триггер `set_updated_at`, таблицы `users`, `locations`,
    `routes`, `vehicles`, `driver_documents`, `moderation_requests`,
    `trips`, `trip_members`, `trip_requests` (PK/FK, CHECK, индексы,
    триггеры `updated_at`).
  - `20260611120100_rls.sql` — функция `public.is_admin()` (SECURITY
    DEFINER), `ENABLE ROW LEVEL SECURITY` и явные политики на всех 9
    таблицах (модель доступа — `architecture.md` 5.2.1; ПД ограничены
    владельцем/админом).
  - `20260611120200_storage.sql` — приватный bucket `driver-documents`
    и 4 политики `storage.objects` (доступ по первому сегменту пути
    `<user_id>/...` или админ).
- `supabase/seed.sql` — справочники: 5 корпусов, 5 общежитий (вкл. ITMO
  Aparts), 50 маршрутов (все пары корпус↔общежитие в обе стороны).
  Идемпотентен.
- `src/types/db.ts` — TS union-типы enum'ов и интерфейсы строк всех
  таблиц, синхронизированы со схемой.

### Как применено и проверено

- Миграции и сид применены к проекту `ythaejxeaekgxtivqaqp` через
  **Supabase Management API** (`POST /v1/projects/{ref}/database/query`,
  Bearer PAT) — локального supabase CLI / пароля БД нет. PAT использован
  разово, не сохранён в коде/гите. Плейсхолдер `SUPABASE_ACCESS_TOKEN`
  добавлен в `.env.example`.
- Проверено запросами к БД: 9 таблиц с `relrowsecurity = true`; политики
  на каждой таблице + 4 на `storage.objects`; 11 enum-типов; `locations`
  = 5 campus + 5 dormitory; `routes` = 50; bucket `driver-documents`
  приватный.

### Что НЕ сделано (намеренно)

- Нет записей `users` (создаются на шаге 3 через Telegram-авторизацию;
  `users.id` ссылается на `auth.users`).
- Bucket для фото авто/аватаров — на шаге 7.
- Безопасная вью публичного профиля (имя/аватар водителя без ИСУ/телефона
  для списка поездок) — добавится на шаге 6, где понадобится.
- `npm install` в этой среде не прошёл (нет сети), поэтому `tsc`/`lint`
  локально не запускались; `src/types/db.ts` — без импортов, проверится
  на следующей сборке.

## Шаг 3 (часть 3a). UI-флоу авторизации на мок-провайдере — выполнено

Дата: 2026-06-11. Шаг 3 разбит на части (решение пользователя): **3a** —
весь UI-флоу на мок-провайдере (без Telegram/Supabase); **3b** (следующее)
— реальный `telegram-auth` Edge Function и персистентность в Supabase.

### Решения

- Стратегия сессии (для 3b) зафиксирована в `architecture.md` 5.1:
  **Edge Function `telegram-auth` + Admin API** (проверка HMAC initData,
  детерминированная `auth.users`, возврат сессии, `setSession` на клиенте).
- Мок ITMO ID — за интерфейсом `services/itmoId.ts`
  (`fetchItmoIdProfile`), детерминированный по логину; точка замены на
  реальный SSO. Контракт — в `architecture.md` 5.1.
- Маршрутизация Mini App — по состоянию профиля (без URL-роутера):
  loading/error → Splash; нет ИСУ → регистрация; ИСУ есть, ITMO ID не
  привязан → вход ITMO ID; иначе → главный экран пассажира.

### Что сделано (файлы)

- `src/services/itmoId.ts` — мок ITMO ID: `fetchItmoIdProfile(login,
  password)`, 5 детерминированных профилей по хэшу логина, аватар через
  DiceBear по логину, ошибка `ItmoIdEmptyCredentialsError`.
- `src/services/auth.ts` — интерфейс `AuthBackend` (`authenticate`,
  `updateProfile`, `signOut`) + **мок-реализация** (localStorage). Экспорт
  `authBackend` — точка замены на Supabase в 3b.
- `src/app/auth-context.ts`, `src/app/AuthProvider.tsx`,
  `src/hooks/useAuth.ts` — контекст/провайдер/хук авторизации
  (state: loading/error/ready + действия `setIsuNumber`, `linkItmoId`,
  `updateDescription`, `signOut`, `retry`).
- `src/app/AppFlow.tsx` — переключение экранов по состоянию; `src/App.tsx`
  обёрнут в `AuthProvider` + `AppFlow`.
- Экраны `src/pages/`: `SplashScreen` (6.1), `RegistrationScreen` (6.2,
  поле ИСУ + валидация `^\d{4,10}$`), `ItmoIdLoginScreen` (логин/пароль,
  мок-вход), `PassengerHomeScreen` (заглушка профиля + дев-кнопка сброса).
- UI-примитивы `src/components/ui/`: `input`, `label`, `spinner`;
  композиционные `src/components/`: `AppScreen`, `BrandMark`.
  Добавлены в `design_system.md`.

### Не сделано / отложено

- **Часть 3b**: Edge Function `telegram-auth`, чтение `initDataRaw` из
  Telegram SDK, реальная Supabase-сессия и запись в `public.users`,
  секреты Edge Function (`TELEGRAM_BOT_TOKEN`, `AUTH_USER_SECRET`).
- Экран профиля с редактируемым «Описание» (5.8) — на шаге 4.
- Сборка/линт/прогон не выполнялись локально: в этой среде нет доступа к
  npm-реестру (нельзя `npm install`). Код 3a написан под существующий
  tsconfig (strict, `verbatimModuleSyntax`), но требует проверки
  `npm install && npm run build` и прогон `npm run dev` на машине с сетью.

## Шаг 3 (часть 3b). Реальная Telegram-авторизация — выполнено

Дата: 2026-06-11.

### Что сделано (файлы)

- `supabase/functions/telegram-auth/index.ts` — Edge Function (Deno):
  проверка HMAC-подписи initData bot-token'ом, проверка `auth_date`
  (24ч), создание/поиск `auth.users` (детерминированные email
  `tg<telegram_id>@telegram.podvezi.local` и пароль =
  HMAC(`AUTH_USER_SECRET`, telegram_id)), `signInWithPassword`, upsert
  строки `public.users`, возврат `{ access_token, refresh_token,
  is_new_user }`. CORS включён.
- `src/lib/telegram.ts` — добавлены `isTelegramEnv()` и
  `getInitDataRaw()` (через `retrieveRawInitData` из SDK).
- `src/services/auth.ts` — добавлена Supabase-реализация `AuthBackend`
  (`authenticate` через `functions.invoke('telegram-auth')` +
  `auth.setSession` + чтение `public.users`; `updateProfile` через
  `from('users').update` под RLS; `signOut`). Выбор backend:
  `isTelegramEnv() ? supabase : mock` — в Telegram реальная авторизация,
  в браузере (дев/демо) мок.

### Деплой и проверка

- Секреты Edge Function заданы через Management API:
  `TELEGRAM_BOT_TOKEN`, `AUTH_USER_SECRET` (случайный, хранится только в
  секретах Supabase). Авто-инжект `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY`.
- Функция задеплоена через Management API (`POST /functions/deploy`,
  `verify_jwt = false`), статус ACTIVE.
- Проверено end-to-end (curl + подписанный initData):
  невалидная подпись → 401; без `initDataRaw` → 400; OPTIONS → 200 (CORS);
  валидный initData → 200 c access/refresh, `is_new_user: true`, затем
  повторно `false` (идемпотентность); строки в `auth.users` и
  `public.users` создаются; каскадное удаление работает. Тестовый
  пользователь удалён.
- Frontend: `npm run build` и `npm run lint` — без ошибок.

### Не проверено (требует устройства)

- Реальный клиентский флоу внутри Telegram (`retrieveRawInitData` +
  `functions.invoke` + `setSession`) — нужно открыть Mini App из бота на
  HTTPS-хосте (Vercel/туннель). Логика бэкенда уже подтверждена.
- `AUTH_USER_SECRET` хранится только в Supabase. Его смена инвалидирует
  детерминированные пароли существующих пользователей (сейчас их нет).

## Шаг 4. Роли и профиль — выполнено

Дата: 2026-06-11.

### Модель (уточнение пользователя, зафиксировано в `architecture.md` 5.1.1)

- **Активная роль — локальная** (в памяти, не персистится). На главном
  экране переключатель «Пассажир» (всегда) / «Водитель» (заблокирован
  замком, пока `driver_verification_status` ≠ `approved`).
- Клик по заблокированному «Водителю» → модалка по статусу
  (none/rejected → подача заявки **UI-заглушка**; pending → «на проверке»;
  approved → режим водителя).
- Права водителя (создание поездок) гейтятся по
  `driver_verification_status = approved`, не по `users.role`.

### Что сделано

- **Миграция** `supabase/migrations/20260611130000_role_guard.sql`
  (применена через Management API, проверена end-to-end):
  - триггер `guard_users_update` — обычный пользователь не может
    self-assign `role='admin'` и не может ставить себе `approved`/
    `rejected` (только `none`/`rejected` → `pending`);
  - RLS `trips` INSERT переписан на гейт по `approved` (без требования
    роли).
  - Проверено реальной сессией: self-approve и self-admin → 400 (blocked);
    правка описания и подача заявки (→pending) → 200.
- **Frontend**:
  - `src/app/AuthenticatedApp.tsx` — оболочка авторизованной части
    (навигация главный ↔ профиль, локальный view-state).
  - `src/pages/HomeScreen.tsx` — шапка (аватар → профиль), `RoleSwitcher`,
    контент по активной роли, модалка верификации. Заменил
    `PassengerHomeScreen` (удалён).
  - `src/pages/ProfileScreen.tsx` — аватар, ФИО, бейдж статуса, курс/
    возраст/ИСУ/Telegram (нередактируемые), редактируемое «Описание» (5.8)
    с сохранением через `updateDescription`; дев-кнопка сброса.
  - Компоненты `src/components/`: `RoleSwitcher`, `DriverVerificationModal`,
    `Modal`, `Avatar`; примитивы `ui/badge`, `ui/textarea`; хелпер
    `src/lib/verification.ts` (бейдж статуса). Добавлены в `design_system.md`.
  - `AppFlow` → авторизованная ветка рендерит `AuthenticatedApp`.
- `npm run build` и `npm run lint` — без ошибок.

### Не сделано / отложено

- Полная форма заявки водителя (данные авто `vehicles` + загрузка фото
  ВУ/СТС в Storage + `moderation_requests`) — **шаг 7** (сейчас кнопка
  «Подать заявку» — заглушка).
- Прогон в реальном Telegram — как и для шага 3, требует HTTPS-хоста.

## Шаг 5. Маршруты — выполнено

Дата: 2026-06-11.

### Решение по валидации (зафиксировано в `architecture.md` 5.2.3)

Уточнение пользователя: выбор точки — только из справочника `locations`
(ТЗ 5.5.2, без свободного ввода адреса). Любая пара **различных активных**
точек допустима; `routes` НЕ используется как ограничение — остаётся
справочником «популярных» комбинаций для будущих подсказок/сортировки в UI
(не реализовано).

### Что сделано (файлы)

- `src/services/locations.ts` — `fetchLocations()` (активные `locations`,
  сортировка по `kind`/`name`), `validateRoutePair(originId, destinationId)`
  (обе точки выбраны и различаются).
- `src/hooks/useLocations.ts` — хук загрузки справочника точек
  (`locations`/`loading`/`error`).
- `src/components/ui/select.tsx` — выпадающий список на базе
  `@base-ui/react/select` (`Select`, `SelectTrigger`, `SelectValue`,
  `SelectContent`, `SelectGroup`, `SelectGroupLabel`, `SelectItem`),
  стилизован в духе `Input` (`h-11`, токены дизайн-системы).
- `src/components/LocationPicker.tsx` — переиспользуемый выбор одной точки:
  корпуса и общежития одним списком с группировкой и иконками
  (`Building2`/`Home`).
- `src/components/RouteSelector.tsx` — пара `LocationPicker` «Откуда»/«Куда»
  + кнопка-свап + сообщение об ошибке при совпадении точек.
- `src/pages/HomeScreen.tsx` — карточка «Поиск поездок» (роль «Пассажир»)
  теперь показывает `RouteSelector` (загрузка/ошибка справочника точек —
  `Spinner`/текст ошибки). Список поездок по маршруту — шаг 6.
- Добавлены в `design_system.md`: `Select`, `LocationPicker`,
  `RouteSelector`.
- `npm run build` и `npm run lint` — без ошибок.

### Не сделано / отложено

- Подсказки/сортировка по «популярным» маршрутам из `routes` — не
  реализованы (зафиксировано как возможное расширение в `architecture.md`
  5.2.3).
- Использование выбранного маршрута для поиска/создания поездок — шаг 6.

### Фикс: RLS `locations`/`routes` для dev-режима

При ручной проверке в браузере (без Telegram, мок-авторизация) дропдауны
точек оказались пустыми: RLS-политики `locations_select_all` /
`routes_select_all` (шаг 2) разрешали SELECT только `authenticated`, а в
dev-режиме нет реальной Supabase-сессии → запросы шли как `anon` и
возвращали `[]` (проверено через REST API с anon-ключом).

- Решение пользователя: `locations`/`routes` не содержат персональных
  данных → SELECT открыт также для `anon`.
- Миграция `supabase/migrations/20260611140000_locations_routes_anon_select.sql`
  (пересоздаёт обе политики с `to anon, authenticated`).
- `architecture.md` 5.2.1/5.2.3 обновлены.
- **Применена** к Supabase-проекту (`ythaejxeaekgxtivqaqp`) через
  Management API (PAT использован разово, не сохранён). Проверено:
  `pg_policies` — `locations_select_all`/`routes_select_all` теперь
  `roles = {anon,authenticated}`; REST-запрос `locations` с anon-ключом
  возвращает данные.

## Шаг 6. Создание и поиск поездок — выполнено

Дата: 2026-06-11.

### Решения (зафиксированы в `architecture.md` 5.2/5.2.1/5.4/5.5)

- **Заявки пассажира идут через апрув водителя** (уточнение пользователя):
  `trip_requests` (status=`pending`) → водитель принимает/отклоняет; при
  принятии **атомарно** (RPC `accept_trip_request`, `SECURITY INVOKER`):
  `trip_requests.status='accepted'` + `insert trip_members` (confirmed) +
  `trips.seats_available--`.
- **Безопасный публичный профиль** — вью `user_public_profiles` (`id,
  full_name, avatar_url, course`), `security_invoker=false`, `grant select`
  для `anon, authenticated` — для отображения водителя/пассажиров в списках.
- **Guard-триггер** `guard_trip_requests_insert` (BEFORE INSERT на
  `trip_requests`): блокирует заявку на несуществующую/неактивную поездку и
  заявку водителя на свою поездку.
- **Повторная заявка после отклонения/отмены — заблокирована навсегда**
  (решение пользователя): используется существующий `UNIQUE(trip_id,
  passenger_id)` как есть; `joinTrip` ловит `23505` →
  «Вы уже подавали заявку на эту поездку».
- **Realtime**: `trips`, `trip_members`, `trip_requests` добавлены в
  публикацию `supabase_realtime` (RLS уважается).
- `vehicle_id` в `trips` остаётся `NULL` (появится на шаге 7).

### Что сделано (файлы)

- Миграции:
  - `supabase/migrations/20260611150000_trip_requests_and_profiles.sql` —
    вью `user_public_profiles`, триггер `guard_trip_requests_insert`, RPC
    `accept_trip_request`.
  - `supabase/migrations/20260611150100_realtime_publication.sql` —
    `trips`/`trip_members`/`trip_requests` в `supabase_realtime`.
- Типы: `src/types/db.ts` (добавлен `UserPublicProfile`), новый
  `src/types/trips.ts` (`TripWithRoute`, `TripRequestWithTrip`,
  `TripRequestWithPassenger`, `TripMemberWithPassenger`,
  `DriverTripWithDetails`, `TripSearchFilters`, `CreateTripInput`).
- Хелперы `src/lib/`: `datetime.ts` (формат даты/времени, границы суток,
  без внешних библиотек), `tripStatus.ts`, `tripRequestStatus.ts` (бейджи
  статусов поездки/заявки).
- `src/services/trips.ts` — `createTrip`, `searchTrips`,
  `getMyDriverTrips`, `getMyPassengerTrips`, `joinTrip`,
  `acceptTripRequest`, `rejectTripRequest`, `cancelTripRequest` (контракт —
  `architecture.md` 5.5).
- Хуки: `useTripSearch`, `useMyDriverTrips`, `useMyPassengerTrips` (паттерн
  `useLocations` + realtime-подписка → `refetch()`).
- Компоненты: `src/components/TripCard.tsx` (карточка поездки: маршрут,
  дата/время, места, цена, водитель, слоты `badge`/`footer`),
  `src/components/TripSearchFilterBar.tsx` (фильтры дата/время).
- Экраны: `src/pages/TripCreateScreen.tsx` (создание поездки, экран 6.7),
  `src/pages/MyTripsScreen.tsx` (экран 6.6/6.8 — «Мои поездки» для
  водителя и пассажира).
- `src/app/AuthenticatedApp.tsx` — добавлены `View` `'trip-create'` /
  `'my-trips'`, `activeRole` поднят сюда (передаётся в `HomeScreen` и
  `MyTripsScreen`).
- `src/pages/HomeScreen.tsx` — главный экран водителя (6.6): «Создать
  поездку», «Мои поездки», «Поездки без водителя» (заглушка, шаг 9);
  главный экран пассажира (6.8): `RouteSelector` + `TripSearchFilterBar` +
  список `TripCard` с кнопкой «Присоединиться» (`joinTrip`) + кнопка «Мои
  поездки».
- `npm run build` и `npm run lint` — без ошибок.

### Что НЕ сделано (намеренно, отложено)

- Отмена уже подтверждённого участия (`trip_members.status='cancelled'`) —
  вне рамок шага 6.
- `vehicle_id` в `trips` — шаг 7 (регистрация авто водителя).
- «Поездки без водителя» (`driver_id = null`) — шаг 9, на главном экране
  водителя пока заглушка-кнопка (disabled).
- Применение миграций к Supabase-проекту и ручная end-to-end проверка
  (создание поездки, заявка, принятие/отклонение, realtime) — выполняется
  пользователем через SQL Editor (PAT через Bash заблокирован
  классификатором auto-режима как утечка кредов).

## Следующий шаг

**Шаг 7: Регистрация и верификация водителя** — подача заявки на роль
водителя, данные автомобиля (`vehicles`), загрузка документов
(`driver_documents`), статусы верификации.
