import type { IncidentResponse } from '@/api/types'
import { SlaClockBadge } from '@/components/SlaClockBadge'
import { SlaUsageBar } from '@/components/SlaUsageBar'
import { formatDateTime } from '@/lib/time'
import { useNow } from '@/lib/useNow'
import { Panel } from './Panel'
import { resolutionClock, responseClock, runningOverdueMs, type ClockInput } from './slaClocks'

/** Both SLA clocks, with their deadlines and how much of the running window is used. */
export function SlaPanel({ incident }: { incident: IncidentResponse }) {
  const used = incident.slaPercentUsed
  const now = useNow()
  return (
    <Panel title="SLA">
      <dl className="space-y-4">
        <ClockRow title="Response" clock={responseClock(incident)} stoppedLabel="Acknowledged" />
        <ClockRow title="Resolution" clock={resolutionClock(incident)} stoppedLabel="Resolved" />
      </dl>
      {used !== null && (
        <SlaUsageBar
          percent={used}
          overdueMs={runningOverdueMs(incident, now)}
          caption="Time used on the current clock"
          className="mt-4 border-t pt-4"
        />
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
