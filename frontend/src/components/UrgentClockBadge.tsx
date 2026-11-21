import { AlarmClockOff, Clock, TimerOff } from 'lucide-react'
import type { IncidentResponse } from '@/api/types'
import { mostUrgentClock } from '@/features/incident/slaClocks'
import { SLA_TONE_CLASS } from '@/lib/slaTone'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/useNow'

/** The most urgent running SLA clock as one badge: "Respond in 3m", "Resolve in 4h 11m", "Breached". */
export function UrgentClockBadge({ incident, className }: { incident: IncidentResponse; className?: string }) {
  const now = useNow(30_000) // re-render every 30 s so the time left counts down
  const clock = mostUrgentClock(incident, now)
  const Icon = clock.state === 'breached' ? AlarmClockOff : clock.state === 'none' ? TimerOff : Clock
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-sm border border-transparent px-1.5 text-xs font-medium whitespace-nowrap',
        SLA_TONE_CLASS[clock.state],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {clock.label}
    </span>
  )
}
