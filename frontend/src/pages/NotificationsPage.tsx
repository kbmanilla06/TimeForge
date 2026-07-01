import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { listNotifications, markNotificationRead } from '../lib/notificationApi'
import type { AppNotification } from '../types/notification'

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
    return <p className="mx-auto max-w-2xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-3">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm ${
              notification.read_at ? 'text-slate-400' : 'text-slate-900'
            }`}
          >
            <span>{notification.data.message}</span>
            {!notification.read_at && (
              <button
                type="button"
                onClick={() => handleMarkRead(notification)}
                className="text-slate-900 underline"
              >
                Mark read
              </button>
            )}
          </li>
        ))}
        {notifications.length === 0 && <p className="text-slate-400">No notifications yet.</p>}
      </ul>
    </main>
  )
}
