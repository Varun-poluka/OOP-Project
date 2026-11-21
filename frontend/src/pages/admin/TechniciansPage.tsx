import { Users } from 'lucide-react'
import type { TechnicianResponse } from '@/api/types'
import { useTechnicians } from '@/api/useReferenceData'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { cn } from '@/lib/utils'

/** Read-only overview of the technicians the assignment strategies choose from. */
export function TechniciansPage() {
  const technicians = useTechnicians()
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Technicians"
        description="Skills, availability and how much of each technician's capacity is in use."
      />
      <QueryState
        query={technicians}
        isEmpty={(data) => data.length === 0}
        empty={<EmptyState icon={Users} title="No technicians yet" />}
      >
        {(data) => (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[44rem] text-left">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Technician</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Skills</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="w-64 px-4 py-2.5 font-medium">Workload</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...data]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((tech) => (
                    <tr key={tech.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="font-medium">{tech.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{tech.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tech.skills.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                          {tech.skills.map((skill) => (
                            <span key={skill} className="rounded-sm border bg-muted/50 px-1.5 py-0.5 text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span
                            aria-hidden
                            className={cn('size-2 rounded-full', tech.available ? 'bg-sla-ok' : 'bg-phase-closed')}
                          />
                          {tech.available ? 'Available' : 'Away'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <WorkloadBar tech={tech} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  )
}

/** Active incidents out of the maximum; full (no more automatic assignments) is shown in words too. */
function WorkloadBar({ tech }: { tech: TechnicianResponse }) {
  const percent = tech.maxWorkload > 0 ? Math.min(100, (tech.activeIncidents / tech.maxWorkload) * 100) : 0
  const full = tech.activeIncidents >= tech.maxWorkload
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-mono tabular">
          {tech.activeIncidents} / {tech.maxWorkload} active
        </span>
        {full && <span className="font-medium text-sla-warning">Full</span>}
      </div>
      <div
        role="meter"
        aria-label={`${tech.name} workload`}
        aria-valuemin={0}
        aria-valuemax={tech.maxWorkload}
        aria-valuenow={tech.activeIncidents}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full', full ? 'bg-sla-warning' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
