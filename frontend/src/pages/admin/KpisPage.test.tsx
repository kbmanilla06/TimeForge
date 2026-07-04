import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as kpiApi from '../../lib/kpiApi'
import { KpisPage } from './KpisPage'

vi.mock('../../lib/kpiApi')

describe('KpisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders existing KPIs with target and unit', async () => {
    vi.mocked(kpiApi.listKpis).mockResolvedValue([
      { id: 1, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 1 },
    ])

    render(<KpisPage />)

    expect(await screen.findByText('Bugs Resolved')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('bugs')).toBeInTheDocument()
  })

  it('creates a KPI with the entered fields', async () => {
    const user = userEvent.setup()
    vi.mocked(kpiApi.listKpis).mockResolvedValue([])
    vi.mocked(kpiApi.createKpi).mockResolvedValue({
      id: 1,
      name: 'Features Completed',
      target_value: 5,
      unit: 'features',
      created_by: 1,
    })

    render(<KpisPage />)
    await screen.findByText('No KPIs yet.')

    await user.type(screen.getByLabelText('Name'), 'Features Completed')
    await user.type(screen.getByLabelText('Target'), '5')
    await user.type(screen.getByLabelText('Unit'), 'features')
    await user.click(screen.getByRole('button', { name: 'Add KPI' }))

    await waitFor(() => {
      expect(kpiApi.createKpi).toHaveBeenCalledWith({
        name: 'Features Completed',
        target_value: 5,
        unit: 'features',
      })
    })
  })
})
