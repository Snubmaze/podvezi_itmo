import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Базовый мобильный layout экрана: центрированная колонка ограниченной
 * ширины, безопасные отступы. Подгонка под safe-area Telegram — шаг 10.
 */
export function AppScreen({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="min-h-svh w-full bg-background">
      <div
        className={cn(
          'mx-auto flex min-h-svh w-full max-w-md flex-col px-5 py-8',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
