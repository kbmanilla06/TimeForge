import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../../lib/adminApi'
import { ProjectsPage } from './ProjectsPage'

vi.mock('../../lib/adminApi')

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminApi.listClients).mockResolvedValue([
      { id: 1, name: 'Acme Corp', projects_count: 1 },
    ])
    vi.mocked(adminApi.listProjects).mockResolvedValue([
      { id: 1, name: 'Website Redesign', client_id: 1, client: { id: 1, name: 'Acme Corp' } },
      { id: 2, name: 'Internal Tooling', client_id: null, client: null },
    ])
  })

  it('renders projects with their client name', async () => {
    render(<ProjectsPage />)

    const websiteRow = (await screen.findByText('Website Redesign')).closest('tr')
    expect(websiteRow).not.toBeNull()
    expect(within(websiteRow!).getByText('Acme Corp')).toBeInTheDocument()

    const toolingRow = screen.getByText('Internal Tooling').closest('tr')
    expect(within(toolingRow!).getByText('—')).toBeInTheDocument()
  })

  it('creates a new project with a selected client', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.createProject).mockResolvedValue({
      id: 3,
      name: 'Mobile App',
      client_id: 1,
      client: { id: 1, name: 'Acme Corp' },
    })

    render(<ProjectsPage />)
    await screen.findByText('Website Redesign')

    await user.type(screen.getByPlaceholderText('New project name'), 'Mobile App')
    await user.selectOptions(screen.getByDisplayValue('— No client —'), '1')
    await user.click(screen.getByRole('button', { name: 'Add Project' }))

    await waitFor(() => {
      expect(adminApi.createProject).toHaveBeenCalledWith({ name: 'Mobile App', client_id: 1 })
    })
  })

  it('deletes a project after confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(adminApi.deleteProject).mockResolvedValue(null)

    render(<ProjectsPage />)
    await screen.findByText('Website Redesign')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(adminApi.deleteProject).toHaveBeenCalledWith(1)
  })
})
