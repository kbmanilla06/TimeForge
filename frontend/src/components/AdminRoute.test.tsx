import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoute } from './AdminRoute'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<div>Admin Users Page</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRoute', () => {
  it('renders the nested route when the user is an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })

    renderAdminRoute()

    expect(screen.getByText('Admin Users Page')).toBeInTheDocument()
  })

  it('redirects to home when the user is not an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee' } })

    renderAdminRoute()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument()
  })
})
