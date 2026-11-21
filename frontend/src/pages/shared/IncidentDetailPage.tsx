import { useParams } from 'react-router'
import { FileSearch } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

export function IncidentDetailPage() {
  // useParams reads the ":id" part of the URL /incidents/:id.
  const { id = '' } = useParams()
  return (
    <PlaceholderPage
      eyebrow={`Incident · ${id}`}
      title="Incident detail"
      description="Status, SLA deadlines, notes and the full audit trail for one incident."
      comingSoon="The incident's details, timeline and the actions your role may take on it (GET /api/incidents/{id})."
      icon={FileSearch}
    />
  )
}
