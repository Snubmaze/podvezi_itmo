# Дизайн-система — "Попутчик ИТМО"

## Цветовые токены (источник — предоставлено пользователем)

Светлая тема. Значения ниже — единственный источник истины для цветов;
применены в `src/index.css` (см. таблицу маппинга).

```css
:root {
  --color-bg: #F5F6F8;
  --color-surface: #FFFFFF;
  --color-border: #E6E8EC;

  --color-text-primary: #15171A;
  --color-text-secondary: #6B7280;
  --color-text-tertiary: #A1A6AE;

  --color-primary: #2F6FED;
  --color-primary-foreground: #FFFFFF;
  --color-primary-muted: #E8EFFE;

  --color-success: #2BB673;
  --color-success-muted: #E5F7EE;
  --color-success-foreground: #1A7A4C;

  --color-warning: #F5A623;
  --color-warning-muted: #FFF4E0;
  --color-warning-foreground: #B5760A;

  --color-danger: #E5484D;
  --color-danger-muted: #FCE9E9;
  --color-danger-foreground: #B53337;

  --color-neutral: #8A8F98;
  --color-neutral-muted: #EEF0F2;
  --color-neutral-foreground: #5F6570;
}
```

## Маппинг на переменные shadcn/ui (Tailwind v4, `src/index.css`)

| Токен дизайн-системы | shadcn/ui переменная | Назначение |
|---|---|---|
| `--color-bg` | `--background` | фон страницы |
| `--color-surface` | `--card`, `--popover`, `--sidebar` | поверхности карточек/попапов |
| `--color-text-primary` | `--foreground`, `--card-foreground`, `--popover-foreground` | основной текст |
| `--color-text-secondary` | `--muted-foreground` | вторичный текст |
| `--color-text-tertiary` | `--tertiary` (доп. токен) | третичный текст (плейсхолдеры, подписи) |
| `--color-border` | `--border`, `--input`, `--sidebar-border` | границы, поля ввода |
| `--color-primary` | `--primary`, `--ring`, `--sidebar-primary` | основной акцент, фокус-кольцо |
| `--color-primary-foreground` | `--primary-foreground`, `--sidebar-primary-foreground` | текст на primary |
| `--color-primary-muted` | `--accent`, `--sidebar-accent` | подсветка/выбранное состояние |
| `--color-neutral-muted` | `--secondary`, `--muted`, `--accent-foreground`(text) | вторичные кнопки, плашки |
| `--color-danger` | `--destructive` | деструктивные действия/ошибки |
| `--color-success` / `-muted` / `-foreground` | `--success` / `--success-muted` / `--success-foreground` (доп. токены) | статусы "одобрено", "поездка завершена" и т.п. |
| `--color-warning` / `-muted` / `-foreground` | `--warning` / `--warning-muted` / `--warning-foreground` (доп. токены) | статусы "на модерации", "ожидание" |
| `--color-danger` / `-muted` / `-foreground` | `--danger` / `--danger-muted` / `--danger-foreground` (доп. токены) | статусы "отклонено", "отменено" |
| `--color-neutral` / `-muted` / `-foreground` | `--neutral` / `--neutral-muted` / `--neutral-foreground` (доп. токены) | нейтральные статусы (например "черновик") |

`--success*`, `--warning*`, `--danger*`, `--neutral*`, `--tertiary` —
дополнительные токены поверх стандартного набора shadcn/ui, добавлены в
`@theme inline` в `src/index.css`. Доступны как Tailwind-утилиты:
`bg-success`, `text-success-foreground`, `bg-success-muted`,
`bg-warning`, `text-warning-foreground`, `bg-warning-muted`,
`bg-danger`, `text-danger-foreground`, `bg-danger-muted`,
`bg-neutral`, `text-neutral-foreground`, `bg-neutral-muted`,
`text-tertiary`.

**Использование статусных токенов** — типовой паттерн для бейджей
статусов (верификация водителя, статус поездки, заявки и т.д.):

| Семантика статуса | Токены |
|---|---|
| Одобрено / активно / завершено успешно | `success` / `success-muted` / `success-foreground` |
| На рассмотрении / ожидание | `warning` / `warning-muted` / `warning-foreground` |
| Отклонено / отменено / ошибка | `danger` / `danger-muted` / `danger-foreground` |
| Черновик / неактивно / нейтральный статус | `neutral` / `neutral-muted` / `neutral-foreground` |

## Тёмная тема — TODO

Пользователь предоставил токены только для светлой темы. В
`src/index.css` для `.dark` сейчас используются производные значения
(затемнённый фон, осветлённый primary и статусные цвета для контраста),
подобранные как разумное приближение — **черновик**, требует
подтверждения/уточнения на шаге 10 (UI/UX полировка, dark/light,
Telegram themes).

## Типографика, отступы, радиусы — не специфицированы

Пользователь не предоставил отдельных токенов для типографики, шкалы
отступов и радиусов. Используются дефолты shadcn/ui:

- Шрифт: `Geist Variable` (через `@fontsource-variable/geist`).
- Радиус: `--radius: 0.625rem` (база для `--radius-sm` … `--radius-4xl`).
- Отступы — стандартная шкала Tailwind.

Если для проекта нужны другие значения — добавить их в этот файл и в
`@theme inline` / `:root` в `src/index.css`.

## Принципы использования

- Все UI-компоненты — на базе shadcn/ui (`src/components/ui`), стили —
  через Tailwind-классы, ссылающиеся на токены выше (`bg-background`,
  `text-foreground`, `bg-primary`, `bg-success-muted` и т.п.).
- Не использовать произвольные hex-цвета в компонентах — только токены
  из этой таблицы (через Tailwind-классы или CSS-переменные).
- Адаптация под Telegram Mini Apps (`themeParams`, safe-area) — шаг 10.
- Нативные `input[type=date]`/`input[type=time]`: глобально в
  `src/index.css` (`@layer base`) сброшен `appearance` (iOS WebKit иначе
  не даёт полю ужаться под колонку грида) и выровнено значение влево
  (`::-webkit-date-and-time-value`). В разметке ячейкам грида с такими
  полями нужен `min-w-0`.

## Компоненты (по мере появления)

Базовые примитивы `src/components/ui/` (на базе shadcn/ui, токены выше):

| Компонент | Файл | Назначение |
|---|---|---|
| `Button` | `ui/button.tsx` | кнопки (variant: default/outline/secondary/ghost/destructive/link; size: xs/sm/default/lg/icon\*) |
| `Input` | `ui/input.tsx` | текстовые поля (`h-11`, mobile-friendly), `aria-invalid` для ошибок |
| `Textarea` | `ui/textarea.tsx` | многострочное поле (напр. «Описание» профиля) |
| `Label` | `ui/label.tsx` | подпись к полю формы |
| `Spinner` | `ui/spinner.tsx` | индикатор загрузки (lucide `Loader2`, `animate-spin`) |
| `Badge` | `ui/badge.tsx` | бейдж статуса (variant: primary/success/warning/danger/neutral — статусные токены) |
| `Select` | `ui/select.tsx` | выпадающий список на базе `@base-ui/react/select` (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectGroupLabel`, `SelectItem`); триггер `h-11` как у `Input` |

Композиционные компоненты `src/components/`:

| Компонент | Файл | Назначение |
|---|---|---|
| `AppScreen` | `AppScreen.tsx` | мобильный layout экрана (центр. колонка `max-w-md`, отступы) |
| `BrandMark` | `BrandMark.tsx` | логотип сервиса (иконка авто в фирменном квадрате) |
| `Avatar` | `Avatar.tsx` | аватар с буквенным фолбэком (размер через `className`) |
| `Modal` | `Modal.tsx` | модалка/боттом-шит (оверлей `bg-black/40`, карточка, Esc/клик-вне) |
| `ImageLightbox` | `ImageLightbox.tsx` | полноэкранный просмотр фото внутри приложения (оверлей `bg-black/90`, `object-contain`, кнопка закрытия, Esc/клик-вне) — для документов модерации и т.п., вместо открытия в браузере |
| `RoleSwitcher` | `RoleSwitcher.tsx` | переключатель активной роли (Пассажир/Водитель-с-замком) |
| `LocationPicker` | `LocationPicker.tsx` | выбор одной точки маршрута (`Select`): корпуса/общежития сгруппированы, иконки `Building2`/`Home`; выбор только из справочника `locations` |
| `RouteSelector` | `RouteSelector.tsx` | пара `LocationPicker` «Откуда»/«Куда» + кнопка-свап (`ArrowUpDown`) + сообщение об ошибке, если точки совпадают |
| `TripCard` | `TripCard.tsx` | карточка поездки: маршрут (`origin → destination`, иконка `ArrowRight`), дата/время, места, цена, опционально водитель (`showDriver`), слот `badge` (статус) и `footer` (действия) |
| `TripSearchFilterBar` | `TripSearchFilterBar.tsx` | фильтры поиска поездок — `Input type="date"`/`type="time"` («Дата» / «Время от»), второе поле заблокировано, пока не выбрана дата |

Статус верификации водителя → бейдж: хелпер `src/lib/verification.ts`
(`verificationBadge(status)` → `{ label, variant }`). По аналогии для
поездок — `src/lib/tripStatus.ts` (`tripStatusBadge(status)`) и заявок на
участие — `src/lib/tripRequestStatus.ts` (`tripRequestStatusBadge(status)`).
Форматирование даты/времени поездки и хелперы для фильтров — `src/lib/datetime.ts`
(`formatTripDate`, `formatTripTime`, `combineDateTimeToISO`, `nowIso`,
`startOfDayISO`, `startOfNextDayISO`); без внешних библиотек дат.

**Паттерн формы** (экраны регистрации / входа ITMO ID): `Label` + `Input`
с `aria-invalid`, текст ошибки — `text-sm text-danger-foreground`;
основная кнопка — `Button size="lg" className="w-full"` со `Spinner` в
состоянии submitting. Подсказки/демо-пометки — `text-xs text-tertiary`.
