import { useQuery } from '@tanstack/react-query'
import { Network } from 'lucide-react'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import type { IncidentResponse } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Skeleton } from '@/components/ui/skeleton'
import { criticalityLabel } from '@/lib/labels'
import { Panel } from './Panel'

/** The affected service, and the services that depend on it (they may be hit too). */
export function ImpactPanel({ incident }: { incident: IncidentResponse }) {
  const impact = useQuery({
    queryKey: queryKeys.impact(incident.id),
    queryFn: () => incidentsApi.impact(incident.id),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <Panel title="Affected service">
      <p className="flex items-center gap-2 font-medium">
        <Network aria-hidden className="size-4 text-muted-foreground" />
        {incident.serviceName}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Category: {incident.categoryName}</p>

      <div className="mt-4 border-t pt-3">
        <QueryState
          query={impact}
          errorTitle="Couldn't load the impact"
          loading={<Skeleton className="h-16 w-full" />}
          isEmpty={(data) => data.impacted.length === 0}
          empty={<p className="text-sm text-muted-foreground">No other services depend on this one.</p>}
        >
          {(data) => (
            <>
              <p className="mb-2 text-sm">
                May also affect <span className="font-medium">{data.impactedCount}</span>{' '}
                {data.impactedCount === 1 ? 'service' : 'services'}:
              </p>
              <ul className="space-y-1.5">
                {[...data.impacted]
                  .sort((a, b) => a.distance - b.distance || b.businessCriticality - a.businessCriticality)
                  .map((service) => (
                    <li key={service.id} className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{service.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {criticalityLabel(service.businessCriticality)} · {service.distance === 1 ? 'direct' : `${service.distance} hops`}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </QueryState>
      </div>
    </Panel>
  )
}
