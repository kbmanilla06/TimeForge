import type { AppNotification } from '../types/notification'
import { apiFetch } from './apiClient'

export function listNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>('/notifications')
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' })
}
