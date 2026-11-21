import { Search } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'

export function SearchPage() {
  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Search incidents"
      description="Find incidents by status, priority, category, technician, date range or text."
      comingSoon="Filters and a paged results table backed by GET /api/incidents/search."
      icon={Search}
    />
  )
}
