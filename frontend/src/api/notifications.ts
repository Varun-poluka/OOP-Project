import { apiFetch } from './client'
import type { NotificationResponse, UnreadCountResponse } from './types'

export const notificationsApi = {
  forUser: (userId: string) =>
    apiFetch<NotificationResponse[]>(`/api/users/${encodeURIComponent(userId)}/notifications`),

  unreadCount: () => apiFetch<UnreadCountResponse>('/api/notifications/unread-count'),

  markAsRead: (id: number) => apiFetch<NotificationResponse>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
}
