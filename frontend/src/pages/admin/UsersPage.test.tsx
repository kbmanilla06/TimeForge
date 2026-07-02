import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../../lib/adminApi'
import { UsersPage } from './UsersPage'

vi.mock('../../lib/adminApi')

const mockUseAuth = vi.fn()
vi.mock('../../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderUsersPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>,
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 1, name: 'Admin', role: 'admin' } })
    vi.mocked(adminApi.listUsers).mockResolvedValue([
      {
        id: 1,
        name: 'Admin',
        email: 'admin@timeforge.test',
        role: 'admin',
        status: 'active',
        department_id: null,
        department: null,
      },
      {
        id: 2,
        name: 'Pending Employee',
        email: 'pending@example.com',
        role: 'employee',
        status: 'pending',
        department_id: null,
        department: null,
      },
      {
        id: 3,
        name: 'Active Supervisor',
        email: 'supervisor@example.com',
        role: 'supervisor',
        status: 'active',
        department_id: null,
        department: null,
      },
    ])
  })

  it('renders users with role, status, and department', async () => {
    renderUsersPage()

    expect(await screen.findByText('Pending Employee')).toBeInTheDocument()
    expect(screen.getByText('admin@timeforge.test')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('activates a pending user without requiring confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.activateUser).mockResolvedValue({
      id: 2,
      name: 'Pending Employee',
      email: 'pending@example.com',
      role: 'employee',
      status: 'active',
      department_id: null,
    })

    renderUsersPage()
    await screen.findByText('Pending Employee')

    await user.click(screen.getByRole('button', { name: 'Activate' }))

    await waitFor(() => {
      expect(adminApi.activateUser).toHaveBeenCalledWith(2)
    })
  })

  it('confirms before deactivating another active user', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(adminApi.deactivateUser).mockResolvedValue({
      id: 3,
      name: 'Active Supervisor',
      email: 'supervisor@example.com',
      role: 'supervisor',
      status: 'deactivated',
      department_id: null,
    })

    renderUsersPage()
    await screen.findByText('Active Supervisor')

    const deactivateButtons = screen.getAllByRole('button', { name: 'Deactivate' })
    const otherUsersButton = deactivateButtons.find((button) => !button.hasAttribute('disabled'))
    expect(otherUsersButton).toBeDefined()

    await user.click(otherUsersButton!)

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => {
      expect(adminApi.deactivateUser).toHaveBeenCalledWith(3)
    })
  })

  it('disables the deactivate button for the logged-in admin themselves', async () => {
    renderUsersPage()
    await screen.findByText('Pending Employee')

    const deactivateButtons = screen.getAllByRole('button', { name: 'Deactivate' })
    const selfButton = deactivateButtons.find((button) => button.hasAttribute('disabled'))
    expect(selfButton).toBeDefined()
  })
})
