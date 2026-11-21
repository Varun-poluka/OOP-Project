import { Server } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

export function ServicesPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Services"
      description="The IT services employees can report incidents against."
      comingSoon="A list of IT services. The backend has no services endpoint yet, so this waits for one."
      icon={Server}
    />
  )
}
