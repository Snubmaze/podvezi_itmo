import { Building2, Home } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Location, LocationKind } from '@/types/db'

const KIND_LABEL: Record<LocationKind, string> = {
  campus: 'Корпуса',
  dormitory: 'Общежития',
}

const KIND_ICON: Record<LocationKind, typeof Building2> = {
  campus: Building2,
  dormitory: Home,
}

/**
 * Переиспользуемый выбор точки маршрута (ТЗ 5.5.1, 5.5.2): объединяет
 * корпуса и общежития ИТМО (`locations`) в один список с группировкой и
 * иконками по типу. Выбор только из справочника — свободный ввод адреса
 * невозможен.
 */
export function LocationPicker({
  id,
  locations,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
}: {
  id?: string
  locations: Location[]
  value: string | null
  onChange: (id: string) => void
  placeholder: string
  disabled?: boolean
  invalid?: boolean
}) {
  const groups: { kind: LocationKind; items: Location[] }[] = (
    ['campus', 'dormitory'] as const
  )
    .map((kind) => ({ kind, items: locations.filter((l) => l.kind === kind) }))
    .filter((group) => group.items.length > 0)

  const selected = value ? locations.find((l) => l.id === value) : undefined

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-invalid={invalid}>
        <SelectValue placeholder={placeholder}>
          {() => {
            if (!selected) return null
            const Icon = KIND_ICON[selected.kind]
            return (
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selected.name}</span>
              </span>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groups.map(({ kind, items }) => {
          const Icon = KIND_ICON[kind]
          return (
            <SelectGroup key={kind}>
              <SelectGroupLabel>{KIND_LABEL[kind]}</SelectGroupLabel>
              {items.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{location.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
