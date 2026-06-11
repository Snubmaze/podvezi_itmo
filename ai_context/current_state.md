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

- Нет подключения к реальному Supabase-проекту (нет `.env` с реальными
  значениями — см. вопросы к пользователю).
- Нет миграций БД, схемы таблиц, RLS-политик (шаг 2).
- Нет авторизации через Telegram, регистрации, ролей и экранов (шаги 3-4
  и далее).
- Дизайн-система не наполнена (`design_system.md` — заглушка, ждём
  контент от пользователя).
- Git-репозиторий не инициализирован (директория не была git-репозиторием
  на старте; инициализация — по запросу пользователя).

## Следующий шаг

**Шаг 2: БД и Supabase** — после того как пользователь предоставит данные
Supabase-проекта (или подтвердит, что нужно создать новый) и ответит на
вопросы, заданные в конце этого шага.
