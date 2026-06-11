import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Фильтры поиска поездок по дате/времени (ТЗ 5.7). */
export function TripSearchFilterBar({
  date,
  timeFrom,
  onChangeDate,
  onChangeTimeFrom,
}: {
  date: string | null
  timeFrom: string | null
  onChangeDate: (date: string | null) => void
  onChangeTimeFrom: (time: string | null) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="trip-search-date">Дата</Label>
        <Input
          id="trip-search-date"
          type="date"
          value={date ?? ''}
          onChange={(event) => onChangeDate(event.target.value || null)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trip-search-time">Время от</Label>
        <Input
          id="trip-search-time"
          type="time"
          value={timeFrom ?? ''}
          onChange={(event) => onChangeTimeFrom(event.target.value || null)}
          disabled={!date}
        />
      </div>
    </div>
  )
}
