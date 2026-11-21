import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '@/api/errors'
import { notificationsApi } from '@/api/notifications'
import { queryKeys } from '@/api/queryKeys'
import type { NotificationResponse } from '@/api/types'
import { useAuth } from '@/auth/useAuth'

/** Notifications are polled every 30 s for now; live updates (server push) come later. */
export const NOTIFICATION_POLL_MS = 30_000

/** The logged-in user's notifications, newest first (the backend sorts them). */
export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => notificationsApi.forUser(userId),
    enabled: userId !== '',
    refetchInterval: NOTIFICATION_POLL_MS, // re-ask the server every 30 s while the tab is visible
  })
}

/**
 * Number of unread notifications, for the badge in the top bar.
 * TODO(backend): if an unread-count endpoint is added, only this hook changes.
 * For now it reuses the notifications query: same cache key, so no extra request;
 * `select` derives the count, and the badge re-renders only when the count changes.
 */
export function useUnreadCount(): number {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => notificationsApi.forUser(userId),
    enabled: userId !== '',
    refetchInterval: NOTIFICATION_POLL_MS,
    select: (notifications) => notifications.filter((n) => !n.read).length,
  })
  return query.data ?? 0
}

/** Marks one notification read and updates the cached list right away. */
export function useMarkAsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = queryKeys.notifications(user?.id ?? '')
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: (updated) => {
      // Replace just that item in the cached list, so the dot and the badge update without a refetch.
      queryClient.setQueryData<NotificationResponse[]>(key, (old) =>
        old?.map((n) => (n.id === updated.id ? updated : n)),
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
