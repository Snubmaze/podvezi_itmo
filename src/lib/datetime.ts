/**
 * Форматирование дат/времени поездок (шаг 6). Без внешних зависимостей —
 * используется встроенный `Intl`.
 */

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
})

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

/** Дата поездки для отображения, например "11 июня". */
export function formatTripDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/** Время поездки для отображения, например "14:30". */
export function formatTripTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** Текущее время в ISO 8601 (UTC). */
export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Объединяет значения `<input type="date">` (`YYYY-MM-DD`) и
 * `<input type="time">` (`HH:mm`) в ISO 8601 (локальная таймзона браузера).
 */
export function combineDateTimeToISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}

/** Начало суток (00:00 локального времени) для даты `YYYY-MM-DD`, в ISO. */
export function startOfDayISO(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString()
}

/** Начало следующих суток после `date` (`YYYY-MM-DD`), в ISO. */
export function startOfNextDayISO(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}
