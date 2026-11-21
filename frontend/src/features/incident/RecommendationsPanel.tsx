import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserCheck } from 'lucide-react'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import type { IncidentResponse, TechnicianRecommendation } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Panel } from './Panel'
import { unassignableReason } from './recommendations'
import type { ActionCommand } from './useIncidentAction'

type RecommendationsPanelProps = {
  incident: IncidentResponse
  /** 'assign' for a classified incident, 'reassign' when someone already has it. */
  mode: 'assign' | 'reassign'
  pending: boolean
  run: (command: ActionCommand, options: { onSuccess: () => void }) => void
}

/** Admin only: technicians ranked by the backend, with reasons, and one-click (confirmed) assignment. */
export function RecommendationsPanel({ incident, mode, pending, run }: RecommendationsPanelProps) {
  const [chosen, setChosen] = useState<TechnicianRecommendation | null>(null)
  const recommendations = useQuery({
    queryKey: queryKeys.recommendations(incident.id),
    queryFn: () => incidentsApi.recommendations(incident.id),
  })
  const verb = mode === 'assign' ? 'Assign' : 'Reassign'

  return (
    <Panel title="Recommended technicians" id="recommendations">
      <QueryState
        query={recommendations}
        errorTitle="Couldn't load recommendations"
        loading={<Skeleton className="h-24 w-full" />}
        isEmpty={(data) => data.length === 0}
        empty={<EmptyState icon={UserCheck} title="No technicians to recommend" className="py-6" />}
      >
        {(data) => {
          // Highlight the best-ranked technician who can actually take it (the backend refuses the others).
          const best = data.find((tech) => tech.technicianId !== incident.assignedTechnicianId && unassignableReason(tech) === null)
          return (
            <ol className="space-y-2">
              {data.map((tech, index) => {
                const current = tech.technicianId === incident.assignedTechnicianId
                const blocked = current ? null : unassignableReason(tech)
                const isBest = tech === best
                return (
                  <li key={tech.technicianId} className={cn('rounded-md border p-3', isBest && 'border-primary/40 bg-accent/40')}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 font-mono text-xs text-muted-foreground tabular">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {tech.name}
                          {current && <span className="ml-2 text-xs font-normal text-muted-foreground">(current)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono tabular">{tech.score}</span> pts ·{' '}
                          <span className={tech.available ? '' : 'text-sla-breached'}>
                            {tech.available ? 'available' : 'unavailable'}
                          </span>{' '}
                          · workload <span className="font-mono tabular">{tech.activeIncidents}/{tech.maxWorkload}</span>
                        </p>
                      </div>
                      {blocked !== null ? (
                        <span className="shrink-0 pt-1 text-xs text-muted-foreground" title="The backend refuses technicians who are unavailable or at max workload">
                          {blocked}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant={isBest ? 'default' : 'outline'}
                          disabled={current || pending}
                          onClick={() => setChosen(tech)}
                        >
                          {verb}
                        </Button>
                      )}
                    </div>
                    {tech.reasons.length > 0 && (
                      <ul className="mt-2 ml-7 list-disc pl-4 text-xs text-muted-foreground">
                        {tech.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          )
        }}
      </QueryState>

      {chosen !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setChosen(null)
          }}
          title={`${verb} to ${chosen.name}?`}
          description={
            mode === 'assign'
              ? `${incident.id} will be assigned to ${chosen.name}.`
              : `${incident.id} moves from ${incident.assignedTechnicianName ?? 'the current technician'} to ${chosen.name}.`
          }
          confirmLabel={verb}
          pending={pending}
          onConfirm={() =>
            run(
              { action: mode, technicianId: chosen.technicianId, technicianName: chosen.name },
              { onSuccess: () => setChosen(null) },
            )
          }
        />
      )}
    </Panel>
  )
}
