import { ArrowUpDown } from 'lucide-react'

import { LocationPicker } from '@/components/LocationPicker'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { validateRoutePair } from '@/services/locations'
import type { Location } from '@/types/db'

/**
 * Выбор маршрута: точка отправления + точка назначения (ТЗ 5.5, 5.5.1).
 * Используется при поиске и создании поездок (шаг 6).
 */
export function RouteSelector({
  locations,
  originId,
  destinationId,
  onChangeOrigin,
  onChangeDestination,
}: {
  locations: Location[]
  originId: string | null
  destinationId: string | null
  onChangeOrigin: (id: string) => void
  onChangeDestination: (id: string) => void
}) {
  const validation = validateRoutePair(originId, destinationId)
  const showError = originId !== null && destinationId !== null && !validation.valid

  const handleSwap = () => {
    if (!originId || !destinationId) return
    onChangeOrigin(destinationId)
    onChangeDestination(originId)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="route-origin">Откуда</Label>
        <LocationPicker
          id="route-origin"
          locations={locations}
          value={originId}
          onChange={onChangeOrigin}
          placeholder="Точка отправления"
          invalid={showError}
        />
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleSwap}
          disabled={!originId || !destinationId}
          aria-label="Поменять местами"
        >
          <ArrowUpDown className="size-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="route-destination">Куда</Label>
        <LocationPicker
          id="route-destination"
          locations={locations}
          value={destinationId}
          onChange={onChangeDestination}
          placeholder="Точка назначения"
          invalid={showError}
        />
      </div>

      {showError && <p className="text-sm text-danger-foreground">{validation.error}</p>}
    </div>
  )
}
