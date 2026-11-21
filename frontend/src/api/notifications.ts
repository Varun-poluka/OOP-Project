import { apiFetch } from './client'
import type { NotificationResponse } from './types'

export const notificationsApi = {
  forUser: (userId: string) =>
    apiFetch<NotificationResponse[]>(`/api/users/${encodeURIComponent(userId)}/notifications`),

  markAsRead: (id: number) => apiFetch<NotificationResponse>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
}
