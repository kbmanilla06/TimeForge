import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as kpiApi from '../lib/kpiApi'
import { TeamKpisPage } from './TeamKpisPage'

vi.mock('../lib/kpiApi')

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('TeamKpisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor', department_id: 7 } })
    vi.mocked(kpiApi.listKpis).mockResolvedValue([
      { id: 1, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 1 },
    ])
    vi.mocked(kpiApi.listTeamMembers).mockResolvedValue([{ id: 2, name: 'Jane Employee', department_id: 7 }])
  })

  it('renders team assignments with progress vs target, grouped as current', async () => {
    vi.mocked(kpiApi.listTeamAssignments).mockResolvedValue([
      {
        id: 1,
        kpi_id: 1,
        user_id: 2,
        department_id: null,
        progress_value: 3,
        created_at: '2026-07-01T00:00:00.000Z',
        kpi: { id: 1, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 1 },
        user: { id: 2, name: 'Jane Employee' },
      },
    ])

    render(<TeamKpisPage />)

    expect(await screen.findByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Bugs Resolved' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Jane Employee' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '3 / 10 bugs' })).toBeInTheDocument()
  })

  it('assigns a KPI to a selected person', async () => {
    const user = userEvent.setup()
    vi.mocked(kpiApi.listTeamAssignments).mockResolvedValue([])
    vi.mocked(kpiApi.createAssignment).mockResolvedValue({
      id: 1,
      kpi_id: 1,
      user_id: 2,
      department_id: null,
      progress_value: 0,
      created_at: '2026-07-01T00:00:00.000Z',
    })

    render(<TeamKpisPage />)
    await screen.findByText('No KPI assignments yet.')

    await user.selectOptions(screen.getByDisplayValue('— Select KPI —'), '1')
    await user.selectOptions(screen.getByDisplayValue('— Select person —'), '2')
    await user.click(screen.getByRole('button', { name: 'Assign KPI' }))

    await waitFor(() => {
      expect(kpiApi.createAssignment).toHaveBeenCalledWith({ kpi_id: 1, user_id: 2 })
    })
  })

  it('assigns a KPI to the supervisor\'s own department', async () => {
    const user = userEvent.setup()
    vi.mocked(kpiApi.listTeamAssignments).mockResolvedValue([])
    vi.mocked(kpiApi.createAssignment).mockResolvedValue({
      id: 1,
      kpi_id: 1,
      user_id: null,
      department_id: 7,
      progress_value: 0,
      created_at: '2026-07-01T00:00:00.000Z',
    })

    render(<TeamKpisPage />)
    await screen.findByText('No KPI assignments yet.')

    await user.selectOptions(screen.getByDisplayValue('— Select KPI —'), '1')
    await user.selectOptions(screen.getByDisplayValue('Assign to a person'), 'department')
    await user.click(screen.getByRole('button', { name: 'Assign KPI' }))

    await waitFor(() => {
      expect(kpiApi.createAssignment).toHaveBeenCalledWith({ kpi_id: 1, department_id: 7 })
    })
  })

  it('removes an assignment after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(kpiApi.listTeamAssignments).mockResolvedValue([
      {
        id: 1,
        kpi_id: 1,
        user_id: 2,
        department_id: null,
        progress_value: 3,
        created_at: '2026-07-01T00:00:00.000Z',
        kpi: { id: 1, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 1 },
        user: { id: 2, name: 'Jane Employee' },
      },
    ])
    vi.mocked(kpiApi.deleteAssignment).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<TeamKpisPage />)
    await screen.findByRole('cell', { name: 'Bugs Resolved' })

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(kpiApi.deleteAssignment).toHaveBeenCalledWith(1)
    })
  })

  it('shows completed assignments in the Completed group', async () => {
    vi.mocked(kpiApi.listTeamAssignments).mockResolvedValue([
      {
        id: 1,
        kpi_id: 1,
        user_id: 2,
        department_id: null,
        progress_value: 10,
        created_at: '2026-07-01T00:00:00.000Z',
        kpi: { id: 1, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 1 },
        user: { id: 2, name: 'Jane Employee' },
      },
    ])

    render(<TeamKpisPage />)

    expect(await screen.findByRole('heading', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByText('No current assignments.')).toBeInTheDocument()
    expect(screen.getByText('No pending assignments.')).toBeInTheDocument()
  })
})
