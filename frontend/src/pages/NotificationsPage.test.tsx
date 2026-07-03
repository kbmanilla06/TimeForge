import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as notificationApi from '../lib/notificationApi'
import { NotificationsPage } from './NotificationsPage'

vi.mock('../lib/notificationApi')

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders notification messages', async () => {
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([
      {
        id: 'n1',
        type: 'App\\Notifications\\TimesheetApproved',
        data: { message: 'Your timesheet for 2026-01-14 was approved.' },
        read_at: null,
        created_at: '2026-01-14T10:00:00Z',
      },
    ])

    render(<NotificationsPage />)

    expect(await screen.findByText('Your timesheet for 2026-01-14 was approved.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument()
  })

  it('hides the mark-read button for already-read notifications', async () => {
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([
      {
        id: 'n2',
        type: 'App\\Notifications\\TimesheetApproved',
        data: { message: 'Already read message.' },
        read_at: '2026-01-14T11:00:00Z',
        created_at: '2026-01-14T10:00:00Z',
      },
    ])

    render(<NotificationsPage />)

    expect(await screen.findByText('Already read message.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument()
  })

  it('marks a notification as read', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([
      {
        id: 'n1',
        type: 'App\\Notifications\\TimesheetApproved',
        data: { message: 'Your timesheet was approved.' },
        read_at: null,
        created_at: '2026-01-14T10:00:00Z',
      },
    ])
    vi.mocked(notificationApi.markNotificationRead).mockResolvedValue({
      id: 'n1',
      type: 'App\\Notifications\\TimesheetApproved',
      data: { message: 'Your timesheet was approved.' },
      read_at: '2026-01-14T12:00:00Z',
      created_at: '2026-01-14T10:00:00Z',
    })

    render(<NotificationsPage />)
    await screen.findByText('Your timesheet was approved.')

    await user.click(screen.getByRole('button', { name: 'Mark read' }))

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledWith('n1')
    })
  })

  it('shows Mark all read only when there are unread notifications, and calls the bulk endpoint', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([
      {
        id: 'n1',
        type: 'App\\Notifications\\TimesheetApproved',
        data: { message: 'Unread one.' },
        read_at: null,
        created_at: '2026-01-14T10:00:00Z',
      },
    ])
    vi.mocked(notificationApi.markAllNotificationsRead).mockResolvedValue({ message: 'All notifications marked as read.' })

    render(<NotificationsPage />)
    await screen.findByText('Unread one.')

    await user.click(screen.getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => {
      expect(notificationApi.markAllNotificationsRead).toHaveBeenCalled()
    })
  })

  it('hides Mark all read when every notification is already read', async () => {
    vi.mocked(notificationApi.listNotifications).mockResolvedValue([
      {
        id: 'n2',
        type: 'App\\Notifications\\TimesheetApproved',
        data: { message: 'Already read.' },
        read_at: '2026-01-14T11:00:00Z',
        created_at: '2026-01-14T10:00:00Z',
      },
    ])

    render(<NotificationsPage />)
    await screen.findByText('Already read.')

    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument()
  })
})
