import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as notificationApi from '../lib/notificationApi'
import type { AppNotification } from '../types/notification'
import { NotificationCenter } from './NotificationCenter'

vi.mock('../lib/notificationApi')

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'App\\Notifications\\TimesheetApproved',
    data: { message: 'Your timesheet was approved.' },
    read_at: null,
    created_at: '2026-01-14T10:00:00Z',
    ...overrides,
  }
}

function renderCenter(unreadCount: number | undefined, onNewNotification = vi.fn()) {
  return render(
    <MemoryRouter>
      <NotificationCenter unreadCount={unreadCount} onNewNotification={onNewNotification} />
    </MemoryRouter>,
  )
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification()])
  })

  it('shows no unread badge and no "Mark all read" action when unreadCount is 0', async () => {
    const user = userEvent.setup()
    renderCenter(0)
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    const bell = screen.getByRole('button', { name: 'Notifications' })
    expect(bell.querySelector('.bg-red-500')).toBeNull()

    await user.click(bell)
    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument()
  })

  it('shows no unread badge while unreadCount has not resolved yet (undefined)', () => {
    renderCenter(undefined)

    const bell = screen.getByRole('button', { name: 'Notifications' })
    expect(bell.querySelector('.bg-red-500')).toBeNull()
  })

  it('shows the unreadCount prop as the badge, not a count derived from the fetched list', async () => {
    // The fetched list only has 1 item, but the true total (from the
    // shared sidebar-badges poll) is 7 — the badge must reflect that
    // true total, not undercount based on the small recent-list fetch.
    renderCenter(7)

    expect(await screen.findByText('7')).toBeInTheDocument()
  })

  it('opens the dropdown on click and lists recent notifications, with a link to view all', async () => {
    const user = userEvent.setup()
    renderCenter(1)
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('Your timesheet was approved.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/notifications')
  })

  it('marks a notification as read when clicked in the dropdown', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.markNotificationRead).mockResolvedValue(notification({ read_at: '2026-01-14T12:00:00Z' }))
    renderCenter(1)
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(screen.getByText('Your timesheet was approved.'))

    await waitFor(() => expect(notificationApi.markNotificationRead).toHaveBeenCalledWith('n1'))
  })

  it('calls markAllNotificationsRead from "Mark all read"', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.markAllNotificationsRead).mockResolvedValue({ message: 'ok' })
    renderCenter(1)
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => expect(notificationApi.markAllNotificationsRead).toHaveBeenCalled())
  })

  it('re-fetches the recent list when the dropdown is opened', async () => {
    const user = userEvent.setup()
    renderCenter(1)
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(2))
  })
})

describe('NotificationCenter unreadCount-driven refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not toast on the initial load, even if unreadCount starts above 0', async () => {
    const onNewNotification = vi.fn()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification()])

    renderCenter(3, onNewNotification)
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(1))

    expect(onNewNotification).not.toHaveBeenCalled()
  })

  it('reports a newly-arrived unread notification to onNewNotification when unreadCount increases', async () => {
    const onNewNotification = vi.fn()
    vi.mocked(notificationApi.listNotifications)
      .mockResolvedValueOnce([]) // initial load: nothing yet
      .mockResolvedValueOnce([notification()]) // after the count increases

    const { rerender } = render(
      <MemoryRouter>
        <NotificationCenter unreadCount={0} onNewNotification={onNewNotification} />
      </MemoryRouter>,
    )
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(1))
    expect(onNewNotification).not.toHaveBeenCalled()

    rerender(
      <MemoryRouter>
        <NotificationCenter unreadCount={1} onNewNotification={onNewNotification} />
      </MemoryRouter>,
    )

    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(2))
    expect(onNewNotification).toHaveBeenCalledWith(notification())
  })

  it('does not re-fetch when unreadCount decreases (e.g. after marking read elsewhere)', async () => {
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification({ read_at: '2026-01-14T12:00:00Z' })])

    const { rerender } = render(
      <MemoryRouter>
        <NotificationCenter unreadCount={2} onNewNotification={vi.fn()} />
      </MemoryRouter>,
    )
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(1))

    rerender(
      <MemoryRouter>
        <NotificationCenter unreadCount={1} onNewNotification={vi.fn()} />
      </MemoryRouter>,
    )

    // Give any (incorrect) refetch a chance to happen before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(notificationApi.listNotifications).toHaveBeenCalledTimes(1)
  })
})
