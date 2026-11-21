import { Shuffle } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

export function AssignmentStrategyPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Assignment strategy"
      description="How new incidents are matched to technicians."
      comingSoon="The current strategy and a switch between the available ones (GET/PUT /api/admin/assignment-strategy)."
      icon={Shuffle}
    />
  )
}
