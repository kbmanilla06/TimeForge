import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SupervisorRoute } from './SupervisorRoute'

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderSupervisorRoute() {
  return render(
    <MemoryRouter initialEntries={['/team-timesheets']}>
      <Routes>
        <Route element={<SupervisorRoute />}>
          <Route path="/team-timesheets" element={<div>Team Timesheets Page</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SupervisorRoute', () => {
  it('renders the nested route for a supervisor', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })

    renderSupervisorRoute()

    expect(screen.getByText('Team Timesheets Page')).toBeInTheDocument()
  })

  it('renders the nested route for an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })

    renderSupervisorRoute()

    expect(screen.getByText('Team Timesheets Page')).toBeInTheDocument()
  })

  it('redirects an employee to home', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee' } })

    renderSupervisorRoute()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Team Timesheets Page')).not.toBeInTheDocument()
  })
})
