import { Timer } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

export function SlaPoliciesPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="SLA policies"
      description="Response and resolution targets for each priority."
      comingSoon="Editable targets for P1–P4 (GET/PUT /api/admin/sla/policies) and a manual SLA check."
      icon={Timer}
    />
  )
}
