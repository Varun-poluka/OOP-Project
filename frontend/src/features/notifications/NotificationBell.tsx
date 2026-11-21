import { Link } from 'react-router'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadCount } from './useNotifications'

/** Top-bar bell with the unread count; links to the notifications page. */
export function NotificationBell() {
  const unread = useUnreadCount()
  const label = unread === 0 ? 'Notifications' : `Notifications, ${unread} unread`
  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label={label}>
      <Link to="/notifications">
        <Bell />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-p1 px-1 font-mono text-[10px] leading-none font-medium text-white tabular"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    </Button>
  )
}
