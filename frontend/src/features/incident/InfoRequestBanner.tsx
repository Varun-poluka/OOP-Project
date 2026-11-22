import { MessageCircleQuestion } from 'lucide-react'
import type { IncidentResponse } from '@/api/types'
import { formatDateTime } from '@/lib/time'
import { COMMENT_FORM_ID } from './NotesSection'

/**
 * Shown while the technician waits for an answer (incident.pendingInfoRequest is set).
 * For the reporter it is a highlighted call to action with a link to the reply box; for
 * everyone else a quieter line saying the incident is waiting on the reporter.
 */
export function InfoRequestBanner({ incident, isReporter }: { incident: IncidentResponse; isReporter: boolean }) {
  const question = incident.pendingInfoRequest
  if (question === null) return null
  const asked = incident.infoRequestedAt === null ? '' : ` · ${formatDateTime(incident.infoRequestedAt)}`

  if (!isReporter) {
    return (
      <p className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
        <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>
          Waiting for {incident.reporterName} to answer: <span className="italic">“{question}”</span>
          <span className="text-muted-foreground">{asked}</span>
        </span>
      </p>
    )
  }

  return (
    <section
      role="status"
      aria-label="Information requested"
      className="rounded-lg border border-sla-warning/60 bg-sla-warning/10 p-4"
    >
      <div className="flex items-start gap-3">
        <MessageCircleQuestion aria-hidden className="mt-0.5 size-5 shrink-0 text-sla-warning" />
        <div className="min-w-0 space-y-1">
          <h2 className="font-semibold">Information requested</h2>
          <p className="text-sm">
            {incident.assignedTechnicianName ?? 'The technician'} asked
            <span className="text-muted-foreground">{asked}</span>:
          </p>
          <p className="text-sm font-medium whitespace-pre-wrap">“{question}”</p>
          <a href={`#${COMMENT_FORM_ID}`} className="inline-block pt-1 text-sm font-medium underline underline-offset-4">
            Answer below
          </a>
        </div>
      </div>
    </section>
  )
}
