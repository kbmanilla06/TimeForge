import type { AppNotification } from '../types/notification'
import { apiFetch } from './apiClient'

export function listNotifications(limit?: number): Promise<AppNotification[]> {
  const query = limit ? `?${new URLSearchParams({ limit: String(limit) })}` : ''
  return apiFetch<AppNotification[]>(`/notifications${query}`)
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/notifications/read-all', { method: 'PATCH' })
}
