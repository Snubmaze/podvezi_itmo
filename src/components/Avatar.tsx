import { cn } from '@/lib/utils'

/** Аватар пользователя с буквенным фолбэком. Размер задаётся через className. */
export function Avatar({
  url,
  name,
  className,
}: {
  url: string | null
  name: string | null
  className?: string
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={cn(
          'rounded-full border border-border bg-muted object-cover',
          className,
        )}
      />
    )
  }
  const initial = (name?.trim()?.[0] ?? 'С').toUpperCase()
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground',
        className,
      )}
    >
      {initial}
    </div>
  )
}
