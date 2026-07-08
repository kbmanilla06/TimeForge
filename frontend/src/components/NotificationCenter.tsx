import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/notificationApi'
import type { AppNotification } from '../types/notification'

const RECENT_LIMIT = 5

/**
 * Sprint 38: the bell badge's count comes from the parent's own
 * unreadCount prop (the same aggregated, always-correct total already
 * polled once for every sidebar badge via useSidebarBadges) instead of
 * being re-derived here from a separately-polled, windowed list of the
 * 5 most recent notifications — that used to undercount as soon as more
 * than 5 were unread, and disagree with the sidebar's own nav badge.
 * This also removes NotificationCenter's own independent polling
 * interval entirely, halving background notification request volume:
 * the recent list (for the dropdown) is now fetched on demand — once on
 * mount, when the dropdown opens, and whenever unreadCount increases
 * (used as the signal to detect and toast a newly-arrived notification).
 */
export function NotificationCenter({
  unreadCount,
  onNewNotification,
}: {
  unreadCount: number | undefined
  onNewNotification: (notification: AppNotification) => void
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const seenIds = useRef<Set<string> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Kept in a ref so effects can call the latest callback without
  // needing it in their dependency arrays.
  const onNewNotificationRef = useRef(onNewNotification)
  onNewNotificationRef.current = onNewNotification

  async function refreshList() {
    try {
      const result = await listNotifications(RECENT_LIMIT)

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
      // Non-critical — keep showing the last known list.
    }
  }

  useEffect(() => {
    void refreshList()
    // Initial load only — later refreshes are driven by unreadCount
    // changes and the dropdown being opened, not a timer.
  }, [])

  // undefined while the shared badge poll hasn't resolved yet — only
  // start comparing once a real baseline exists, so the first genuine
  // count that arrives is never mistaken for "new" notifications and
  // toasted (mirrors the old seenIds.current === null guard above).
  const previousUnreadCount = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (unreadCount === undefined) return

    if (previousUnreadCount.current !== undefined && unreadCount > previousUnreadCount.current) {
      void refreshList()
    }
    previousUnreadCount.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    if (isOpen) void refreshList()
  }, [isOpen])

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

  const displayCount = unreadCount ?? 0

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
        {displayCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {displayCount > 9 ? '9+' : displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-line bg-white p-2 shadow-card">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {displayCount > 0 && (
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
