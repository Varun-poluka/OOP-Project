import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '@/api/errors'
import { notificationsApi } from '@/api/notifications'
import { queryKeys } from '@/api/queryKeys'
import type { NotificationResponse } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { usePollWhileOffline } from '@/live/useLiveStatus'

// While the live stream is up, a "notification" event refreshes these; polling only runs when it is down.

/** The logged-in user's notifications, newest first (the backend sorts them). */
export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => notificationsApi.forUser(userId),
    enabled: userId !== '',
    refetchInterval: usePollWhileOffline(),
  })
}

/**
 * Number of unread notifications, for the badge in the top bar, from
 * GET /api/notifications/unread-count. A live "notification" event writes the new
 * count straight into this query's cache (see live/eventToInvalidations.ts).
 */
export function useUnreadCount(): number {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: queryKeys.unreadCount(userId),
    queryFn: notificationsApi.unreadCount,
    enabled: userId !== '',
    refetchInterval: usePollWhileOffline(),
    select: (response) => response.unreadCount,
  })
  return query.data ?? 0
}

/** Marks one notification read and updates the cached list right away. */
export function useMarkAsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? ''
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: (updated) => {
      // Replace just that item in the cached list, so its dot updates without a refetch.
      queryClient.setQueryData<NotificationResponse[]>(queryKeys.notifications(userId), (old) =>
        old?.map((n) => (n.id === updated.id ? updated : n)),
      )
      // The count lives in its own query now; ask the server for the new number.
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount(userId) })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
