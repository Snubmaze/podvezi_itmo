import { cn } from '@/lib/utils'

/** Базовая карточка (ITMO-стиль): мягкие углы, поверхность, граница. */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-2xl border border-border bg-card p-4', className)}
      {...props}
    />
  )
}

export { Card }
