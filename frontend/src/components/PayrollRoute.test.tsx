import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PayrollRoute } from './PayrollRoute'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderPayrollRoute() {
  return render(
    <MemoryRouter initialEntries={['/payroll']}>
      <Routes>
        <Route element={<PayrollRoute />}>
          <Route path="/payroll" element={<div>Payroll Page</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PayrollRoute', () => {
  it('renders the nested route for hr_finance', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'hr_finance' } })

    renderPayrollRoute()

    expect(screen.getByText('Payroll Page')).toBeInTheDocument()
  })

  it('renders the nested route for an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })

    renderPayrollRoute()

    expect(screen.getByText('Payroll Page')).toBeInTheDocument()
  })

  it('redirects a supervisor to home', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })

    renderPayrollRoute()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Payroll Page')).not.toBeInTheDocument()
  })

  it('redirects an employee to home', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee' } })

    renderPayrollRoute()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Payroll Page')).not.toBeInTheDocument()
  })
})
