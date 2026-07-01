import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../../lib/adminApi'
import { ClientsPage } from './ClientsPage'

vi.mock('../../lib/adminApi')

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminApi.listClients).mockResolvedValue([
      { id: 1, name: 'Acme Corp', projects_count: 2 },
      { id: 2, name: 'Globex', projects_count: 0 },
    ])
  })

  it('renders clients with their project counts', async () => {
    render(<ClientsPage />)

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('creates a new client and reloads the list', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.createClient).mockResolvedValue({ id: 3, name: 'Initech', projects_count: 0 })

    render(<ClientsPage />)
    await screen.findByText('Acme Corp')

    await user.type(screen.getByPlaceholderText('New client name'), 'Initech')
    await user.click(screen.getByRole('button', { name: 'Add Client' }))

    await waitFor(() => {
      expect(adminApi.createClient).toHaveBeenCalledWith({ name: 'Initech' })
    })
    expect(adminApi.listClients).toHaveBeenCalledTimes(2)
  })

  it('warns about affected projects and deletes only when confirmed', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(adminApi.deleteClient).mockResolvedValue(null)

    render(<ClientsPage />)
    await screen.findByText('Acme Corp')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2 project'))
    expect(adminApi.deleteClient).toHaveBeenCalledWith(1)
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<ClientsPage />)
    await screen.findByText('Acme Corp')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(adminApi.deleteClient).not.toHaveBeenCalled()
  })
})
