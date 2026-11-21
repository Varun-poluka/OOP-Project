import type { IncidentResponse } from '@/api/types'
import { SlaClockBadge } from '@/components/SlaClockBadge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/time'
import { Panel } from './Panel'
import { resolutionClock, responseClock, type ClockInput } from './slaClocks'

/** Both SLA clocks, with their deadlines and how much of the running window is used. */
export function SlaPanel({ incident }: { incident: IncidentResponse }) {
  const used = incident.slaPercentUsed
  return (
    <Panel title="SLA">
      <dl className="space-y-4">
        <ClockRow title="Response" clock={responseClock(incident)} stoppedLabel="Acknowledged" />
        <ClockRow title="Resolution" clock={resolutionClock(incident)} stoppedLabel="Resolved" />
      </dl>
      {used !== null && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Time used on the current clock</span>
            <span className="font-mono tabular">{used}%</span>
          </div>
          <Progress
            value={Math.min(used, 100)}
            aria-label="Share of the SLA window used"
            className={cn(
              used >= 100 && '[&>[data-slot=progress-indicator]]:bg-sla-breached',
              used >= 75 && used < 100 && '[&>[data-slot=progress-indicator]]:bg-sla-warning',
            )}
          />
        </div>
      )}
    </Panel>
  )
}

function ClockRow({ title, clock, stoppedLabel }: { title: string; clock: ClockInput; stoppedLabel: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <dt className="font-medium">{title}</dt>
        <dd>
          <SlaClockBadge clock={clock} />
        </dd>
      </div>
      <dd className="mt-0.5 text-xs text-muted-foreground">
        {clock.dueAt === null ? 'No deadline' : `Due ${formatDateTime(clock.dueAt)}`}
        {clock.stoppedAt !== null && ` · ${stoppedLabel} ${formatDateTime(clock.stoppedAt)}`}
      </dd>
    </div>
  )
}
