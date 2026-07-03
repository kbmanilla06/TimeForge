import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import { UserFormPage } from './UserFormPage'

vi.mock('../../lib/adminApi')

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/users/new" element={<UserFormPage />} />
        <Route path="/admin/users/:userId/edit" element={<UserFormPage />} />
        <Route path="/admin/users" element={<div>Users List Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UserFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminApi.listDepartments).mockResolvedValue([
      { id: 1, name: 'Engineering', description: null, users_count: 1 },
    ])
  })

  it('creates a user with all fields including password', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.createUser).mockResolvedValue({
      id: 5,
      name: 'New Person',
      email: 'new@example.com',
      role: 'employee',
      status: 'pending',
      department_id: 1,
    })

    renderAt('/admin/users/new')

    await screen.findByLabelText('Name')
    await user.type(screen.getByLabelText('Name'), 'New Person')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Initial Password'), 'password123')
    await user.selectOptions(screen.getByLabelText('Department'), '1')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() => {
      expect(adminApi.createUser).toHaveBeenCalledWith({
        name: 'New Person',
        email: 'new@example.com',
        password: 'password123',
        role: 'employee',
        department_id: 1,
      })
    })
    expect(await screen.findByText('Users List Page')).toBeInTheDocument()
  })

  it('edit mode has no password field and prefills existing values', async () => {
    vi.mocked(adminApi.listUsers).mockResolvedValue([
      {
        id: 2,
        name: 'Existing User',
        email: 'existing@example.com',
        role: 'supervisor',
        status: 'active',
        department_id: 1,
      },
    ])

    renderAt('/admin/users/2/edit')

    expect(await screen.findByDisplayValue('Existing User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('Initial Password')).not.toBeInTheDocument()
  })

  it('submits name, email, role, department_id, and hourly_rate when editing', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.listUsers).mockResolvedValue([
      {
        id: 2,
        name: 'Existing User',
        email: 'existing@example.com',
        role: 'supervisor',
        status: 'active',
        department_id: 1,
      },
    ])
    vi.mocked(adminApi.updateUser).mockResolvedValue({
      id: 2,
      name: 'Renamed User',
      email: 'existing@example.com',
      role: 'supervisor',
      status: 'active',
      department_id: 1,
    })

    renderAt('/admin/users/2/edit')
    await screen.findByDisplayValue('Existing User')

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Renamed User')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(adminApi.updateUser).toHaveBeenCalledWith(2, {
        name: 'Renamed User',
        email: 'existing@example.com',
        role: 'supervisor',
        department_id: 1,
        hourly_rate: null,
      })
    })
  })

  it('prefills an existing hourly rate and submits an updated value', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.listUsers).mockResolvedValue([
      {
        id: 2,
        name: 'Existing User',
        email: 'existing@example.com',
        role: 'supervisor',
        status: 'active',
        department_id: 1,
        hourly_rate: 15,
      },
    ])
    vi.mocked(adminApi.updateUser).mockResolvedValue({
      id: 2,
      name: 'Existing User',
      email: 'existing@example.com',
      role: 'supervisor',
      status: 'active',
      department_id: 1,
      hourly_rate: 25,
    })

    renderAt('/admin/users/2/edit')
    expect(await screen.findByDisplayValue('15')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Hourly Rate'))
    await user.type(screen.getByLabelText('Hourly Rate'), '25')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(adminApi.updateUser).toHaveBeenCalledWith(2, {
        name: 'Existing User',
        email: 'existing@example.com',
        role: 'supervisor',
        department_id: 1,
        hourly_rate: 25,
      })
    })
  })

  it('displays field-level validation errors from the backend', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.createUser).mockRejectedValue(
      new ApiError(422, 'The email has already been taken.', {
        email: ['The email has already been taken.'],
      }),
    )

    renderAt('/admin/users/new')

    await screen.findByLabelText('Name')
    await user.type(screen.getByLabelText('Name'), 'New Person')
    await user.type(screen.getByLabelText('Email'), 'taken@example.com')
    await user.type(screen.getByLabelText('Initial Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
  })
})
