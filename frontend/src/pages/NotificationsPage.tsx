import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { listNotifications, markNotificationRead } from '../lib/notificationApi'
import type { AppNotification } from '../types/notification'
import { Alert } from '../components/ui/Alert'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      setNotifications(await listNotifications())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMarkRead(notification: AppNotification) {
    setError(null)
    try {
      await markNotificationRead(notification.id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to mark notification as read.')
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="Notifications" subtitle="Updates about your timesheets and reviews." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <ul className="space-y-3">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-sm shadow-card ${
              notification.read_at ? 'border-line text-muted' : 'border-primary/30 text-ink'
            }`}
          >
            <span className="flex items-center gap-3">
              {!notification.read_at && (
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
              )}
              {notification.data.message}
            </span>
            {!notification.read_at && (
              <button
                type="button"
                onClick={() => handleMarkRead(notification)}
                className="shrink-0 font-medium text-primary hover:underline"
              >
                Mark read
              </button>
            )}
          </li>
        ))}
        {notifications.length === 0 && <EmptyState>No notifications yet.</EmptyState>}
      </ul>
    </main>
  )
}
