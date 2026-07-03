import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../../lib/adminApi'
import { DepartmentsPage } from './DepartmentsPage'

vi.mock('../../lib/adminApi')

describe('DepartmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminApi.listDepartments).mockResolvedValue([
      { id: 1, name: 'Engineering', description: 'Builds and maintains the product.', users_count: 2 },
      { id: 2, name: 'Marketing', description: null, users_count: 0 },
    ])
  })

  it('renders departments with their user counts', async () => {
    render(<DepartmentsPage />)

    expect(await screen.findByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('creates a new department and reloads the list', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.createDepartment).mockResolvedValue({ id: 3, name: 'Sales', description: null, users_count: 0 })

    render(<DepartmentsPage />)
    await screen.findByText('Engineering')

    await user.type(screen.getByPlaceholderText('New department name'), 'Sales')
    await user.click(screen.getByRole('button', { name: 'Add Department' }))

    await waitFor(() => {
      expect(adminApi.createDepartment).toHaveBeenCalledWith({ name: 'Sales' })
    })
    expect(adminApi.listDepartments).toHaveBeenCalledTimes(2)
  })

  it('warns about affected users and deletes only when confirmed', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(adminApi.deleteDepartment).mockResolvedValue(null)

    render(<DepartmentsPage />)
    await screen.findByText('Engineering')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2 user'))
    expect(adminApi.deleteDepartment).toHaveBeenCalledWith(1)
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<DepartmentsPage />)
    await screen.findByText('Engineering')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(adminApi.deleteDepartment).not.toHaveBeenCalled()
  })

  it('shows existing descriptions and a placeholder when none is set', async () => {
    render(<DepartmentsPage />)

    expect(await screen.findByText('Builds and maintains the product.')).toBeInTheDocument()
    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('edits a department name and description together and saves both', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.updateDepartment).mockResolvedValue({
      id: 1,
      name: 'Engineering & Product',
      description: 'Updated description.',
      users_count: 2,
    })

    render(<DepartmentsPage />)
    await screen.findByText('Engineering')

    const editButtons = screen.getAllByRole('button', { name: 'Edit' })
    await user.click(editButtons[0])

    const nameInput = screen.getByDisplayValue('Engineering')
    await user.clear(nameInput)
    await user.type(nameInput, 'Engineering & Product')

    const descriptionInput = screen.getByDisplayValue('Builds and maintains the product.')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Updated description.')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(adminApi.updateDepartment).toHaveBeenCalledWith(1, {
        name: 'Engineering & Product',
        description: 'Updated description.',
      })
    })
  })
})
