import { CircleCheck, CircleX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { slaClock } from '@/lib/sla'
import { useNow } from '@/lib/useNow'
import type { ClockInput } from '@/features/incident/slaClocks'
import { SlaCountdown } from './SlaCountdown'

const KIND_LABEL = { response: 'Respond', resolution: 'Resolve' } as const

/** One SLA clock: a live countdown while running, then "Met" or "Missed" once it stopped. */
export function SlaClockBadge({ clock, showKind = false, className }: { clock: ClockInput; showKind?: boolean; className?: string }) {
  const now = useNow(30_000)
  const state = slaClock(clock.dueAt, clock.stoppedAt, clock.breached, now)
  const kind = showKind ? KIND_LABEL[clock.kind] : undefined

  if (state.phase === 'running' || state.phase === 'none') {
    return <SlaCountdown dueAt={clock.dueAt} breached={clock.breached} label={kind} className={className} />
  }
  const met = state.phase === 'met'
  const Icon = met ? CircleCheck : CircleX
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 px-1.5 text-xs whitespace-nowrap',
        met ? 'text-sla-ok' : 'text-sla-breached',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {kind !== undefined && <span className="text-muted-foreground">{kind}</span>}
      <span className="font-medium">{state.label}</span>
    </span>
  )
}
