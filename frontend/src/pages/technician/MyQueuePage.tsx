import { ListTodo } from 'lucide-react'
import { IncidentPreviewTable } from '../IncidentPreviewTable'
import { PlaceholderPage } from '../PlaceholderPage'
import { PreviewSection } from '../PreviewSection'
import { sampleIncidents } from '../sampleData'

export function MyQueuePage() {
  return (
    <PlaceholderPage
      eyebrow="Technician"
      title="My queue"
      description="Incidents assigned to you, most urgent SLA first."
      comingSoon="Your assigned incidents, live from the backend, with acknowledge, start work and resolve actions."
      icon={ListTodo}
    >
      <PreviewSection title="Assigned to you">
        <IncidentPreviewTable incidents={sampleIncidents()} />
      </PreviewSection>
    </PlaceholderPage>
  )
}
