import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as kpiApi from '../lib/kpiApi'
import { MyKpisPage } from './MyKpisPage'

vi.mock('../lib/kpiApi')

describe('MyKpisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders own assignments with progress vs target', async () => {
    vi.mocked(kpiApi.listMyAssignments).mockResolvedValue([
      {
        id: 1,
        kpi_id: 1,
        user_id: 5,
        department_id: null,
        progress_value: 3,
        created_at: '2026-07-01T00:00:00.000Z',
        kpi: { id: 1, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 1 },
      },
    ])

    render(<MyKpisPage />)

    expect(await screen.findByText('Bugs Resolved')).toBeInTheDocument()
    expect(screen.getByText('3 / 10 bugs')).toBeInTheDocument()
    expect(screen.getByText(/Assigned on/)).toBeInTheDocument()
  })

  it('labels a shared department-level assignment', async () => {
    vi.mocked(kpiApi.listMyAssignments).mockResolvedValue([
      {
        id: 2,
        kpi_id: 1,
        user_id: null,
        department_id: 7,
        progress_value: 4,
        created_at: '2026-07-01T00:00:00.000Z',
        kpi: { id: 1, name: 'Campaigns Launched', target_value: null, unit: null, created_by: 1 },
        department: { id: 7, name: 'Marketing' },
      },
    ])

    render(<MyKpisPage />)

    expect(await screen.findByText('Campaigns Launched (department goal)')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows an empty state when no KPIs are assigned', async () => {
    vi.mocked(kpiApi.listMyAssignments).mockResolvedValue([])

    render(<MyKpisPage />)

    expect(await screen.findByText('No KPIs assigned yet.')).toBeInTheDocument()
  })
})
