import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-xl border border-transparent bg-muted px-3.5 py-2.5 text-base transition-[color,box-shadow] outline-none',
        'placeholder:text-tertiary',
        'focus-visible:border-ring focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
