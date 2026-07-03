import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderCenter(onNewNotification = vi.fn()) {
  return render(
    <MemoryRouter>
      <NotificationCenter onNewNotification={onNewNotification} />
    </MemoryRouter>,
  )
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows no unread badge and no "Mark all read" action when nothing is unread', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification({ read_at: '2026-01-14T11:00:00Z' })])
    renderCenter()
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    const bell = screen.getByRole('button', { name: 'Notifications' })
    expect(bell.querySelector('.bg-red-500')).toBeNull()

    await user.click(bell)
    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument()
  })

  it('shows an unread count badge on the bell', async () => {
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification(), notification({ id: 'n2' })])
    renderCenter()

    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('opens the dropdown on click and lists recent notifications, with a link to view all', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification()])
    renderCenter()
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('Your timesheet was approved.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/notifications')
  })

  it('marks a notification as read when clicked in the dropdown', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification()])
    vi.mocked(notificationApi.markNotificationRead).mockResolvedValue(notification({ read_at: '2026-01-14T12:00:00Z' }))
    renderCenter()
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(screen.getByText('Your timesheet was approved.'))

    await waitFor(() => expect(notificationApi.markNotificationRead).toHaveBeenCalledWith('n1'))
  })

  it('calls markAllNotificationsRead from "Mark all read"', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([notification()])
    vi.mocked(notificationApi.markAllNotificationsRead).mockResolvedValue({ message: 'ok' })
    renderCenter()
    await waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => expect(notificationApi.markAllNotificationsRead).toHaveBeenCalled())
  })
})

describe('NotificationCenter polling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports a newly-arrived unread notification to onNewNotification on a later poll, but not on the initial load', async () => {
    const onNewNotification = vi.fn()
    vi.mocked(notificationApi.listNotifications)
      .mockResolvedValueOnce([]) // initial load: nothing yet
      .mockResolvedValueOnce([notification()]) // next poll: a new one arrives

    renderCenter(onNewNotification)
    await vi.waitFor(() => expect(notificationApi.listNotifications).toHaveBeenCalledTimes(1))
    expect(onNewNotification).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(20000)

    expect(onNewNotification).toHaveBeenCalledWith(notification())
  })
})
