import { useNavigate } from 'react-router'
import { Bell, Check } from 'lucide-react'
import type { NotificationResponse } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { useMarkAsRead, useNotifications } from '@/features/notifications/useNotifications'
import { cn } from '@/lib/utils'
import { formatDateTime, formatRelative } from '@/lib/time'
import { useNow } from '@/lib/useNow'

export function NotificationsPage() {
  const notifications = useNotifications()
  const markAsRead = useMarkAsRead()
  const navigate = useNavigate()
  const now = useNow(60_000)

  // Opening marks it read, and goes to the incident when the notification names one.
  function open(notification: NotificationResponse) {
    if (!notification.read) markAsRead.mutate(notification.id)
    if (notification.incidentId !== null) navigate(`/incidents/${encodeURIComponent(notification.incidentId)}`)
  }

  const unread = notifications.data?.filter((n) => !n.read).length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="General"
        title="Notifications"
        description={
          notifications.isSuccess
            ? unread === 0
              ? 'You are all caught up.'
              : `${unread} unread. Updates about incidents you reported or work on.`
            : 'Updates about incidents you reported or work on.'
        }
      />

      <QueryState
        query={notifications}
        isEmpty={(data) => data.length === 0}
        empty={<EmptyState icon={Bell} title="No notifications yet" description="You'll see updates here when incidents you follow change." />}
      >
        {(data) => (
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {data.map((item) => (
              <li key={item.id} className={cn('flex items-start gap-3 px-4 py-3', !item.read && 'bg-accent/30')}>
                <span
                  aria-hidden
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'border' : 'bg-primary')}
                />
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="min-w-0 flex-1 text-left focus-visible:underline focus-visible:outline-none"
                >
                  <span className="sr-only">{item.read ? 'Read: ' : 'Unread: '}</span>
                  <span className={cn('block', item.read ? 'text-muted-foreground' : 'font-medium')}>{item.message}</span>
                  {item.incidentId !== null && (
                    <span className="block font-mono text-xs text-muted-foreground">{item.incidentId}</span>
                  )}
                </button>
                <time
                  dateTime={item.createdAt}
                  title={formatDateTime(item.createdAt)}
                  className="shrink-0 pt-0.5 text-xs text-muted-foreground"
                >
                  {formatRelative(item.createdAt, now)}
                </time>
                {!item.read && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mark "${item.message}" as read`}
                    disabled={markAsRead.isPending && markAsRead.variables === item.id}
                    onClick={() => markAsRead.mutate(item.id)}
                  >
                    <Check />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  )
}
