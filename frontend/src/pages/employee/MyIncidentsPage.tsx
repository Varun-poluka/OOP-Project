import { Link } from 'react-router'
import { FilePlus2, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlaceholderPage } from '../PlaceholderPage'

export function MyIncidentsPage() {
  return (
    <PlaceholderPage
      eyebrow="Employee"
      title="My incidents"
      description="Everything you have reported, newest first, with its status and SLA."
      comingSoon="Your incidents from the search endpoint, filtered by you as reporter. Open one to verify, close or reopen it."
      icon={ListChecks}
      actions={
        <Button asChild>
          <Link to="/incidents/new">
            <FilePlus2 />
            Report incident
          </Link>
        </Button>
      }
    />
  )
}
