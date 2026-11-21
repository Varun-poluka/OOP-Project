import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PriorityBadge } from '@/components/PriorityBadge'
import { QueryState } from '@/components/QueryState'
import { RiskBadge } from '@/components/RiskBadge'
import { SlaUsageBar } from '@/components/SlaUsageBar'
import { StatusBadge } from '@/components/StatusBadge'
import { UrgentClockBadge } from '@/components/UrgentClockBadge'
import { sortAtRisk } from '@/features/incidents/atRisk'
import { usePollWhileOffline } from '@/live/useLiveStatus'

/** Incidents whose SLA is breached or close to it, worst first. */
export function AtRiskPage() {
  const navigate = useNavigate()
  const atRisk = useQuery({
    queryKey: queryKeys.atRisk(),
    queryFn: incidentsApi.atRisk,
    refetchInterval: usePollWhileOffline(),
    // `select` derives the sorted list from the cached data; the cache itself keeps the server's order.
    select: sortAtRisk,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Technician"
        title="At risk"
        description="Your incidents whose SLA is breached or about to be: breached first, then by time used."
      />

      <QueryState
        query={atRisk}
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="Nothing at risk"
            description="Every SLA clock on your incidents has comfortable time left."
          />
        }
      >
        {(incidents) => (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[48rem] text-left">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Incident</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">SLA</th>
                  <th scope="col" className="w-56 px-4 py-2.5 font-medium">Window used</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incidents.map((incident) => {
                  const path = `/incidents/${encodeURIComponent(incident.id)}`
                  return (
                    <tr
                      key={incident.id}
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
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={incident.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <UrgentClockBadge incident={incident} />
                      </td>
                      <td className="px-4 py-3">
                        {incident.slaPercentUsed === null ? (
                          <span className="text-xs text-muted-foreground">No running clock</span>
                        ) : (
                          <SlaUsageBar percent={incident.slaPercentUsed} />
                        )}
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
        )}
      </QueryState>
    </div>
  )
}
