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

## Следующий шаг

**Шаг 3: Telegram-авторизация, регистрация (номер ИСУ) и мок ITMO ID** —
см. `claude_code_promts.md`, Часть 3.
