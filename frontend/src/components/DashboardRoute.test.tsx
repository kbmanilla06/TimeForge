import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DashboardRoute } from './DashboardRoute'

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderDashboardRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<DashboardRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardRoute', () => {
  it('renders the nested route for a supervisor', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })

    renderDashboardRoute()

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('renders the nested route for an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })

    renderDashboardRoute()

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('renders the nested route for hr_finance', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'hr_finance' } })

    renderDashboardRoute()

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('redirects an employee to home', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee' } })

    renderDashboardRoute()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument()
  })
})
