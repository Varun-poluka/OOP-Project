import { Gauge } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

const TILES = ['Open incidents', 'Response SLA met', 'Resolution SLA met', 'Mean time to resolve']

export function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Dashboard"
      description="Volume, SLA compliance and technician workload at a glance."
      comingSoon="Figures and charts from GET /api/reports/summary: counts by status, priority and category, SLA compliance and workload per technician."
      icon={Gauge}
    >
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-4">
        {TILES.map((tile) => (
          <div key={tile} className="bg-card px-4 py-4">
            <dt className="text-xs text-muted-foreground">{tile}</dt>
            <dd className="mt-1 font-mono text-2xl text-muted-foreground tabular">—</dd>
          </div>
        ))}
      </dl>
    </PlaceholderPage>
  )
}
