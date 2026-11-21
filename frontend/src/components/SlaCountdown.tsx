import { AlarmClockOff, Clock, TimerOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBackendDateTime, slaCountdown } from '@/lib/sla'
import { SLA_TONE_CLASS } from '@/lib/slaTone'
import { useNow } from '@/lib/useNow'

type SlaCountdownProps = {
  /** responseDueAt or resolutionDueAt from IncidentResponse. */
  dueAt: string | null
  /** responseBreached / resolutionBreached from IncidentResponse. */
  breached?: boolean
  /** Small caption in front, e.g. "Response" or "Resolve". */
  label?: string
  className?: string
}

/** Time left until an SLA deadline, refreshed every 30 seconds; "Breached" once it has passed. */
export function SlaCountdown({ dueAt, breached = false, label, className }: SlaCountdownProps) {
  const now = useNow(30_000)
  const countdown = slaCountdown(dueAt, now, breached)
  const Icon = countdown.state === 'breached' ? AlarmClockOff : countdown.state === 'none' ? TimerOff : Clock
  const dueText = dueAt === null ? 'No deadline' : `Due ${formatDue(dueAt)}`

  return (
    <span
      title={dueText}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-sm border border-transparent px-1.5 text-xs whitespace-nowrap',
        SLA_TONE_CLASS[countdown.state],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label !== undefined && <span className="text-muted-foreground">{label}</span>}
      <span className="font-mono font-medium tabular">{countdown.label}</span>
      <span className="sr-only">{dueText}</span>
    </span>
  )
}

function formatDue(dueAt: string): string {
  const ms = parseBackendDateTime(dueAt)
  if (Number.isNaN(ms)) return dueAt
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
