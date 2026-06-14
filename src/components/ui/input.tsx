import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full min-w-0 rounded-xl border border-transparent bg-muted px-3.5 py-1 text-base transition-[color,box-shadow] outline-none',
        'placeholder:text-tertiary selection:bg-primary selection:text-primary-foreground',
        'focus-visible:border-ring focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
