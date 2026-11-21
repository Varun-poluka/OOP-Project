import { ArrowRight } from 'lucide-react'
import type { AuditRecordResponse } from '@/api/types'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatRelative } from '@/lib/time'
import { useNow } from '@/lib/useNow'
import { Panel } from './Panel'

/** "PRIORITY_RAISED" -> "Priority raised"; "SLA_RESPONSE_BREACHED" -> "SLA response breached". */
function humaniseAction(action: string): string {
  const words = action.replace(/_/g, ' ').toLowerCase()
  const sentence = words.charAt(0).toUpperCase() + words.slice(1)
  // Lower-casing turned the acronym into "Sla"; put it back.
  return sentence.replace(/\bsla\b/gi, 'SLA')
}

/** Everything that happened to the incident, newest first. */
export function AuditTimeline({ records }: { records: AuditRecordResponse[] }) {
  const now = useNow(60_000)
  // The backend sends them oldest first; copy before reversing (never mutate data from the cache).
  const newestFirst = [...records].reverse()

  return (
    <Panel title="History">
      {newestFirst.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet.</p>
      ) : (
        <ol className="relative space-y-5 border-l pl-5">
          {newestFirst.map((record, index) => (
            <li key={`${record.timestamp}-${index}`} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[1.42rem] size-2 rounded-full border-2 border-card bg-phase-active" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{humaniseAction(record.action)}</span>
                {record.previousStatus !== null && record.newStatus !== null && record.previousStatus !== record.newStatus && (
                  <span className="flex items-center gap-1">
                    <StatusBadge status={record.previousStatus} />
                    <ArrowRight aria-label="to" className="size-3 text-muted-foreground" />
                    <StatusBadge status={record.newStatus} />
                  </span>
                )}
              </div>
              {record.description !== null && record.description.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">{record.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {record.actorName} ·{' '}
                <time dateTime={record.timestamp} title={formatDateTime(record.timestamp)}>
                  {formatRelative(record.timestamp, now)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
