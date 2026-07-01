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
  })

  it('hides admin nav links for non-admin users', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })

    renderLayout()

    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Departments')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Clients')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Projects')).not.toBeInTheDocument()
  })

  it('shows the Time Tracking link to every authenticated role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee', name: 'Bob' }, logout: vi.fn() })

    renderLayout()

    expect(screen.getByText('Time Tracking')).toBeInTheDocument()
  })
})
