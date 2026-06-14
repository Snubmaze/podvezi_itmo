import { Car } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Логотип сервиса: белая иконка автомобиля на фирменном квадрате с
 * сине-красным градиентом (цвета ITMO).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-danger text-white',
        'size-16 shadow-sm',
        className,
      )}
    >
      <Car className="size-8" aria-hidden="true" />
    </div>
  )
}
