import { useState } from 'react'
import { Pencil, Users } from 'lucide-react'
import type { TechnicianResponse } from '@/api/types'
import { useCategories, useTechnicians } from '@/api/useReferenceData'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { WorkloadBar } from '@/components/WorkloadBar'
import { Button } from '@/components/ui/button'
import { TechnicianEditDialog } from '@/features/admin/TechnicianEditDialog'
import { cn } from '@/lib/utils'

/** The technicians the assignment strategies choose from, with an Edit dialog per row. */
export function TechniciansPage() {
  const technicians = useTechnicians()
  const categories = useCategories()
  const [editing, setEditing] = useState<TechnicianResponse | null>(null)
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Technicians"
        description="Skills, availability and how much of each technician's capacity is in use. Accounts are created on the Users page."
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
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
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
                            className={cn(
                              'size-2 rounded-full',
                              tech.active && tech.available ? 'bg-sla-ok' : 'bg-phase-closed',
                            )}
                          />
                          {!tech.active ? 'Deactivated' : tech.available ? 'Available' : 'On leave'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <WorkloadBar tech={tech} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!categories.isSuccess}
                          onClick={() => setEditing(tech)}
                          aria-label={`Edit ${tech.name}`}
                        >
                          <Pencil />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>

      {editing !== null && categories.isSuccess && (
        <TechnicianEditDialog tech={editing} categories={categories.data} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
