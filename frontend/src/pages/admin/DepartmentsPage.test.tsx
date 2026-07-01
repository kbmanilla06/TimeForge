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
      { id: 1, name: 'Engineering', users_count: 2 },
      { id: 2, name: 'Marketing', users_count: 0 },
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
    vi.mocked(adminApi.createDepartment).mockResolvedValue({ id: 3, name: 'Sales', users_count: 0 })

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
})
