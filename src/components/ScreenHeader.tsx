import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

/** Единая шапка экрана: кнопка «Назад» + заголовок + опциональное действие справа. */
export function ScreenHeader({
  title,
  onBack,
  action,
}: {
  title: string
  onBack?: () => void
  action?: ReactNode
}) {
  return (
    <header className="flex items-center gap-1">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="-ml-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  )
}
