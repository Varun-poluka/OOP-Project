import { PriorityBadge } from '@/components/PriorityBadge'
import { SlaCountdown } from '@/components/SlaCountdown'
import { StatusBadge } from '@/components/StatusBadge'
import type { SampleIncident } from './sampleData'

/** A static table of sample incidents, to show the badges and countdown together. */
export function IncidentPreviewTable({ incidents }: { incidents: SampleIncident[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-left">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Incident</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Resolve within</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {incidents.map((incident) => (
            <tr key={incident.id} className="align-middle">
              <td className="px-4 py-3">
                <p className="font-mono text-xs text-muted-foreground">{incident.id}</p>
                <p className="mt-0.5 line-clamp-1 font-medium">{incident.title}</p>
                <p className="text-xs text-muted-foreground">{incident.serviceName}</p>
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={incident.priority} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={incident.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <SlaCountdown dueAt={incident.resolutionDueAt} breached={incident.resolutionBreached} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
