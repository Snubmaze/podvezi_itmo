# Попутчик ИТМО

Telegram Mini App для организации совместных поездок студентов
Университета ИТМО между учебными корпусами и общежитиями.

## Контекст для разработки

Перед началом работы прочитайте `CLAUDE.md` и все файлы в `ai_context/`
(`goal.md`, `architecture.md`, `current_state.md`, `rules.md`, `plan.md`,
`design_system.md`) — это источник истины о цели, архитектуре и текущем
состоянии проекта.

## Стек

React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Telegram Mini Apps
SDK + Supabase.

## Команды

```bash
npm install       # установка зависимостей
npm run dev       # запуск dev-сервера
npm run build     # сборка (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # предпросмотр production-сборки
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните значениями (см.
`ai_context/architecture.md`, раздел про секреты).
