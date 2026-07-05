import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as sidebarBadgeApi from '../lib/sidebarBadgeApi'
import { AppLayout } from './AppLayout'

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseCompanySettings = vi.fn()
vi.mock('../context/useCompanySettings', () => ({
  useCompanySettings: () => mockUseCompanySettings(),
}))

// NotificationCenter fetches on mount — mocked so it doesn't hit the real
// API in tests that aren't about notifications specifically.
vi.mock('../lib/notificationApi', () => ({
  listNotifications: () => Promise.resolve([]),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

vi.mock('../lib/sidebarBadgeApi')

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Home Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.mocked(sidebarBadgeApi.getSidebarBadgeCounts).mockResolvedValue({ notifications: 0 })
    mockUseCompanySettings.mockReturnValue({ companyName: 'TimeForge', logoUrl: null, refresh: vi.fn() })
  })

  it('shows admin nav links for admin users', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByText('Manage Users')).toBeInTheDocument()
    expect(screen.getByText('Manage Departments')).toBeInTheDocument()
    expect(screen.getByText('Manage Clients')).toBeInTheDocument()
    expect(screen.getByText('Manage Projects')).toBeInTheDocument()
    expect(screen.getByText('Manage KPIs')).toBeInTheDocument()
  })

  it('hides admin nav links for non-admin users', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })

    renderLayout()

    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Departments')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Clients')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Projects')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage KPIs')).not.toBeInTheDocument()
  })

  it('shows the Time Tracking, Notifications, My KPIs, and Daily Scrum links to every authenticated role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByText('Time Tracking')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('My KPIs')).toBeInTheDocument()
    expect(screen.getByText('Daily Scrum')).toBeInTheDocument()
  })

  it('shows Team Timesheets, Team KPIs, and Team Scrum to supervisors and admins but not employees', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', name: 'Sam' }, logout: vi.fn() })
    const { unmount } = renderLayout()
    expect(screen.getByText('Team Timesheets')).toBeInTheDocument()
    expect(screen.getByText('Team KPIs')).toBeInTheDocument()
    expect(screen.getByText('Team Scrum')).toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })
    const adminRender = renderLayout()
    expect(adminRender.getByText('Team Timesheets')).toBeInTheDocument()
    expect(adminRender.getByText('Team KPIs')).toBeInTheDocument()
    expect(adminRender.getByText('Team Scrum')).toBeInTheDocument()
    adminRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    renderLayout()
    expect(screen.queryByText('Team Timesheets')).not.toBeInTheDocument()
    expect(screen.queryByText('Team KPIs')).not.toBeInTheDocument()
    expect(screen.queryByText('Team Scrum')).not.toBeInTheDocument()
  })

  it('shows Payroll to admin and hr_finance but not supervisors or employees', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })
    const { unmount } = renderLayout()
    expect(screen.getByText('Payroll')).toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'hr_finance', name: 'Hana' }, logout: vi.fn() })
    const hrRender = renderLayout()
    expect(hrRender.getByText('Payroll')).toBeInTheDocument()
    hrRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', name: 'Sam' }, logout: vi.fn() })
    const supervisorRender = renderLayout()
    expect(supervisorRender.queryByText('Payroll')).not.toBeInTheDocument()
    supervisorRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    renderLayout()
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument()
  })

  it('shows Dashboard to supervisor, admin, and hr_finance but not employees', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', name: 'Sam' }, logout: vi.fn() })
    const { unmount } = renderLayout()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })
    const adminRender = renderLayout()
    expect(adminRender.getByText('Dashboard')).toBeInTheDocument()
    adminRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'hr_finance', name: 'Hana' }, logout: vi.fn() })
    const hrRender = renderLayout()
    expect(hrRender.getByText('Dashboard')).toBeInTheDocument()
    hrRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    renderLayout()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('shows AI Insights to every authenticated role (hr_finance gained access in Sprint 12)', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    const { unmount } = renderLayout()
    expect(screen.getByText('AI Insights')).toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', name: 'Sam' }, logout: vi.fn() })
    const supervisorRender = renderLayout()
    expect(supervisorRender.getByText('AI Insights')).toBeInTheDocument()
    supervisorRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })
    const adminRender = renderLayout()
    expect(adminRender.getByText('AI Insights')).toBeInTheDocument()
    adminRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'hr_finance', name: 'Hana' }, logout: vi.fn() })
    renderLayout()
    expect(screen.getByText('AI Insights')).toBeInTheDocument()
  })

  it("shows an unread-count badge on a nav item once the sidebar-counts poll resolves", async () => {
    vi.mocked(sidebarBadgeApi.getSidebarBadgeCounts).mockResolvedValue({
      notifications: 0,
      team_timesheets: 3,
      team_scrum: 1,
    })
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', name: 'Sam' }, logout: vi.fn() })

    renderLayout()

    await waitFor(() => expect(sidebarBadgeApi.getSidebarBadgeCounts).toHaveBeenCalled())
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders the notification bell in the sidebar for every authenticated role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('shows position (falling back to role when unset) in the footer, linking to Profile Settings', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'employee', name: 'Bob Employee', position: 'Backend Engineer' },
      logout: vi.fn(),
    })

    renderLayout()

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.queryByText('employee')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bob Employee/ })).toHaveAttribute('href', '/profile')
  })

  it('falls back to showing the role when no position is set', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob Employee', position: null }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByText('employee')).toBeInTheDocument()
  })

  it('shows the shared profile picture from context immediately, without its own fetch', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'employee', name: 'Bob Employee' },
      logout: vi.fn(),
      pictureUrl: 'blob:mock-picture-url',
    })

    renderLayout()

    expect(screen.getByAltText("Bob Employee's profile picture")).toHaveAttribute('src', 'blob:mock-picture-url')
  })

  it('mounts the floating AI Assistant button for an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada Admin' }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByLabelText('Open AI Assistant')).toBeInTheDocument()
  })

  it('does not mount the floating AI Assistant button for an employee', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob Employee' }, logout: vi.fn() })

    renderLayout()

    expect(screen.queryByLabelText('Open AI Assistant')).not.toBeInTheDocument()
  })

  it('shows the configured company name instead of a hardcoded literal', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    mockUseCompanySettings.mockReturnValue({ companyName: 'Acme Corp', logoUrl: null, refresh: vi.fn() })

    renderLayout()

    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
    expect(screen.queryByText('TimeForge')).not.toBeInTheDocument()
  })

  it('shows the company logo image when one is configured', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    mockUseCompanySettings.mockReturnValue({
      companyName: 'Acme Corp',
      logoUrl: 'blob:mock-logo-url',
      refresh: vi.fn(),
    })

    renderLayout()

    const logos = screen.getAllByAltText('')
    expect(logos.some((el) => el.getAttribute('src') === 'blob:mock-logo-url')).toBe(true)
  })

  it('shows Company Settings to admins only', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })
    const { unmount } = renderLayout()
    expect(screen.getByText('Company Settings')).toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    renderLayout()
    expect(screen.queryByText('Company Settings')).not.toBeInTheDocument()
  })
})
