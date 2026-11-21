import { Link } from 'react-router'
import { CopyCheck, LoaderCircle } from 'lucide-react'
import type { DuplicateCandidate } from '@/api/types'
import { StatusBadge } from '@/components/StatusBadge'

type DuplicatePanelProps = {
  candidates: DuplicateCandidate[]
  /** True while a newer check is running; the previous candidates stay visible meanwhile. */
  checking?: boolean
}

/**
 * "Possibly already reported": similar open incidents found while the employee types.
 * Only a hint; it never stops them from submitting.
 * score and reasons are only sent to technicians and admins; for employees they are absent.
 */
export function DuplicatePanel({ candidates, checking = false }: DuplicatePanelProps) {
  // Nothing found (or not checked yet): show nothing, so the panel doesn't flash on every pause.
  if (candidates.length === 0) return null

  return (
    <section
      aria-labelledby="duplicates-heading"
      aria-live="polite"
      className="rounded-lg border border-sla-warning/35 bg-sla-warning/6 p-4"
    >
      <div className="flex items-center gap-2">
        <CopyCheck aria-hidden className="size-4 text-sla-warning" />
        <h2 id="duplicates-heading" className="font-medium">
          Possibly already reported
        </h2>
        {checking && <LoaderCircle aria-label="Checking" className="ml-auto size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        These look similar. If one is your problem, you can follow it instead. You can still submit yours.
      </p>
      <ul className="mt-3 space-y-2">
        {candidates.map((candidate) => (
          <li key={candidate.incidentId}>
            <Link
              to={`/incidents/${encodeURIComponent(candidate.incidentId)}`}
              className="block rounded-md border bg-card px-3 py-2.5 transition-colors hover:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{candidate.incidentId}</span>
                {candidate.score !== undefined && (
                  <span className="font-mono text-xs text-muted-foreground tabular" title="Similarity score">
                    · {Math.round(candidate.score * 100)}% match
                  </span>
                )}
                <StatusBadge status={candidate.status} className="ml-auto" />
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{candidate.title}</p>
              {candidate.reasons !== undefined && candidate.reasons.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                  {candidate.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
