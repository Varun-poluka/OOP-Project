import { cn } from '@/lib/utils'
import type { IncidentStatus } from '@/api/types'
import { STATUS_LABEL, STATUS_PHASE, type StatusPhase } from '@/lib/labels'

// Tailwind only generates classes it can see written out in full, so the map lists them all.
const DOT_CLASS: Record<StatusPhase, string> = {
  intake: 'bg-phase-intake',
  active: 'bg-phase-active',
  resolved: 'bg-phase-resolved',
  closed: 'bg-phase-closed',
}

/** A neutral outlined pill with a small coloured dot showing the lifecycle phase. */
export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const phase = STATUS_PHASE[status]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium whitespace-nowrap',
        phase === 'closed' && 'text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT_CLASS[phase])} />
      {STATUS_LABEL[status]}
    </span>
  )
}
