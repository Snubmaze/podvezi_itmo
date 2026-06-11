import { Car } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Логотип сервиса: иконка автомобиля в фирменном квадрате. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-primary text-primary-foreground',
        'size-16 shadow-sm',
        className,
      )}
    >
      <Car className="size-8" aria-hidden="true" />
    </div>
  )
}
