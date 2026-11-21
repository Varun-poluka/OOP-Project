import { FilePlus2 } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

export function ReportIncidentPage() {
  return (
    <PlaceholderPage
      eyebrow="Employee"
      title="Report an incident"
      description="Tell IT what is broken. We'll classify it, set an SLA and assign a technician."
      comingSoon="A form for title, description, category, affected service, impact and urgency (POST /api/incidents)."
      icon={FilePlus2}
    />
  )
}
