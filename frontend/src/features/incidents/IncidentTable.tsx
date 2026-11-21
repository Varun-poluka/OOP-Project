import { Link, useNavigate } from 'react-router'
import type { IncidentResponse } from '@/api/types'
import { PriorityBadge } from '@/components/PriorityBadge'
import { RiskBadge } from '@/components/RiskBadge'
import { SlaClockBadge } from '@/components/SlaClockBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { currentClock } from '@/features/incident/slaClocks'

/** Incidents as a table; clicking a row (or the title link) opens the detail page. */
export function IncidentTable({ incidents, dimmed = false }: { incidents: IncidentResponse[]; dimmed?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className={cn('overflow-x-auto rounded-lg border bg-card transition-opacity', dimmed && 'opacity-60')}>
      <table className="w-full min-w-[44rem] text-left">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Incident</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
            <th scope="col" className="px-4 py-2.5 font-medium">SLA</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {incidents.map((incident) => {
            const path = `/incidents/${encodeURIComponent(incident.id)}`
            return (
              <tr
                key={incident.id}
                // The whole row is clickable for mouse users; the title is a real link for keyboards and screen readers.
                onClick={() => navigate(path)}
                className="cursor-pointer align-middle transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-muted-foreground">{incident.id}</p>
                  <Link
                    to={path}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-0.5 line-clamp-1 font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {incident.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{incident.serviceName}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={incident.priority} />
                </td>
                <td className="px-4 py-3">
                  <SlaClockBadge clock={currentClock(incident)} showKind />
                </td>
                <td className="px-4 py-3">
                  <RiskBadge risk={incident.riskLevel} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

type PagerProps = { page: number; totalPages: number; totalElements: number; pageSize: number; onPage: (page: number) => void }

/** "Showing 16–30 of 42" with previous/next. `page` is 1-based. */
export function Pager({ page, totalPages, totalElements, pageSize, onPage }: PagerProps) {
  if (totalElements === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalElements)
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground tabular">
        Showing {first}–{last} of {totalElements}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-8 rounded-md border px-3 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="h-8 rounded-md border px-3 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
