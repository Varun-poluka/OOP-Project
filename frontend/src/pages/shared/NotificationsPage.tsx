import { Bell } from 'lucide-react'
import { PlaceholderPage } from '../PlaceholderPage'
import { PreviewSection } from '../PreviewSection'

const SAMPLE = [
  { id: 1, incidentId: 'INC-1042', message: 'Incident assigned to you: VPN drops every few minutes', read: false, when: '2 min ago' },
  { id: 2, incidentId: 'INC-1027', message: 'Resolution SLA breached', read: false, when: '1 h ago' },
  { id: 3, incidentId: 'INC-1019', message: 'Incident resolved, waiting for your verification', read: true, when: 'Yesterday' },
]

export function NotificationsPage() {
  return (
    <PlaceholderPage
      eyebrow="General"
      title="Notifications"
      description="Updates about incidents you reported or are working on."
      comingSoon="Your notifications from GET /api/users/{id}/notifications, with mark-as-read."
      icon={Bell}
    >
      <PreviewSection title="Recent">
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {SAMPLE.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <span
                aria-label={item.read ? 'Read' : 'Unread'}
                className={item.read ? 'mt-1.5 size-2 rounded-full border' : 'mt-1.5 size-2 rounded-full bg-primary'}
              />
              <div className="min-w-0 flex-1">
                <p className={item.read ? 'text-muted-foreground' : 'font-medium'}>{item.message}</p>
                <p className="font-mono text-xs text-muted-foreground">{item.incidentId}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{item.when}</span>
            </li>
          ))}
        </ul>
      </PreviewSection>
    </PlaceholderPage>
  )
}
