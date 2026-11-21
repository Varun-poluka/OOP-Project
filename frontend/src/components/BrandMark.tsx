import { cn } from '@/lib/utils'

/** The app's logo: three vertical bars, like rack units in a server cabinet. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="7" className="fill-sidebar-primary" />
      <path
        d="M9 22V10m7 12V10m7 12V10"
        className="stroke-sidebar-primary-foreground"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
