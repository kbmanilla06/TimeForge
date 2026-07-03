import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { POLL_INTERVAL_MS } from '../hooks/useSidebarBadges'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/notificationApi'
import type { AppNotification } from '../types/notification'

const RECENT_LIMIT = 5

export function NotificationCenter({
  onNewNotification,
}: {
  onNewNotification: (notification: AppNotification) => void
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const seenIds = useRef<Set<string> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Kept in a ref (updated every render) so the polling effect below can
  // call the latest callback without needing it in its dependency array —
  // it must run on a stable mount-once interval, not restart whenever the
  // parent re-renders and passes a new function reference.
  const onNewNotificationRef = useRef(onNewNotification)
  onNewNotificationRef.current = onNewNotification

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const result = await listNotifications(RECENT_LIMIT)
        if (cancelled) return

        if (seenIds.current) {
          for (const notification of result) {
            if (!notification.read_at && !seenIds.current.has(notification.id)) {
              onNewNotificationRef.current(notification)
            }
          }
        }
        seenIds.current = new Set(result.map((n) => n.id))
        setNotifications(result)
      } catch {
        // Non-critical background poll — keep showing the last known list.
      }
    }

    void poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  async function handleMarkRead(notification: AppNotification) {
    await markNotificationRead(notification.id)
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)))
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-xl border border-line bg-white p-2 shadow-card">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <ul className="mt-1 max-h-80 space-y-1 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleMarkRead(notification)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-canvas ${
                    notification.read_at ? 'text-muted' : 'font-medium text-ink'
                  }`}
                >
                  {notification.data.message}
                </button>
              </li>
            ))}
            {notifications.length === 0 && <li className="px-2 py-4 text-center text-sm text-muted">No notifications yet.</li>}
          </ul>

          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="mt-1 block rounded-lg px-2 py-2 text-center text-sm font-medium text-primary hover:bg-canvas"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
