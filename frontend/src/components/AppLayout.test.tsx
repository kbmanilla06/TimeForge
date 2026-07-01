import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

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

  it('shows the Time Tracking, Notifications, and My KPIs links to every authenticated role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByText('Time Tracking')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('My KPIs')).toBeInTheDocument()
  })

  it('shows Team Timesheets and Team KPIs to supervisors and admins but not employees', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', name: 'Sam' }, logout: vi.fn() })
    const { unmount } = renderLayout()
    expect(screen.getByText('Team Timesheets')).toBeInTheDocument()
    expect(screen.getByText('Team KPIs')).toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'admin', name: 'Ada' }, logout: vi.fn() })
    const adminRender = renderLayout()
    expect(adminRender.getByText('Team Timesheets')).toBeInTheDocument()
    expect(adminRender.getByText('Team KPIs')).toBeInTheDocument()
    adminRender.unmount()

    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })
    renderLayout()
    expect(screen.queryByText('Team Timesheets')).not.toBeInTheDocument()
    expect(screen.queryByText('Team KPIs')).not.toBeInTheDocument()
  })
})
