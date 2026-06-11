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

## Следующий шаг

**Шаг 4: Роли и профиль** — экран профиля (ФИО/курс/возраст/аватар из
ITMO ID — нередактируемые; «Описание» 5.8 — редактируемое), базовые роли.
См. `claude_code_promts.md`, Часть 4.
