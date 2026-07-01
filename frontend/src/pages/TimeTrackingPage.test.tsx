import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/apiClient'
import * as timeEntryApi from '../lib/timeEntryApi'
import { TimeTrackingPage } from './TimeTrackingPage'

vi.mock('../lib/timeEntryApi')

const baseSummary = {
  today_minutes: 60,
  week_minutes: 120,
  month_minutes: 300,
  payroll_period_minutes: 300,
  payroll_period_start: '2026-01-01',
  payroll_period_end: '2026-01-15',
}

function manualEntrySection() {
  const heading = screen.getByRole('heading', { name: /Add Manual Time Entry|Edit Time Entry/ })
  return within(heading.closest('section') as HTMLElement)
}

describe('TimeTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(timeEntryApi.listProjectsForSelf).mockResolvedValue([
      { id: 1, name: 'Website Redesign', client_id: null },
    ])
    vi.mocked(timeEntryApi.listClientsForSelf).mockResolvedValue([{ id: 1, name: 'Acme Corp' }])
    vi.mocked(timeEntryApi.getSummary).mockResolvedValue(baseSummary)
  })

  it('renders the summary totals and existing entries', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        project_id: 1,
        client_id: null,
        department_id: null,
        date: '2026-01-14',
        start_time: '2026-01-14 09:00:00',
        end_time: '2026-01-14 10:00:00',
        duration_minutes: 60,
        task: 'Build login page',
        work_category: 'Development',
        description: 'Did the thing.',
        reference_links: null,
        deliverables: null,
        project: { id: 1, name: 'Website Redesign', client_id: null },
      },
    ])

    render(<TimeTrackingPage />)

    expect(await screen.findByText('Build login page')).toBeInTheDocument()
    expect(screen.getByText('Today').closest('div')).toHaveTextContent('1h 0m')
    expect(screen.getByRole('cell', { name: 'Website Redesign' })).toBeInTheDocument()
  })

  it('shows a running timer with a Stop button instead of the start form', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 2,
        user_id: 1,
        project_id: null,
        client_id: null,
        department_id: null,
        date: '2026-01-14',
        start_time: new Date().toISOString(),
        end_time: null,
        duration_minutes: null,
        task: 'Live task',
        work_category: 'Development',
        description: 'Working now.',
        reference_links: null,
        deliverables: null,
      },
    ])

    render(<TimeTrackingPage />)

    expect(await screen.findByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Timer' })).not.toBeInTheDocument()
  })

  it('starts a timer via the form when none is running', async () => {
    const user = userEvent.setup()
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([])
    vi.mocked(timeEntryApi.startTimer).mockResolvedValue({
      id: 3,
      user_id: 1,
      project_id: null,
      client_id: null,
      department_id: null,
      date: '2026-01-14',
      start_time: new Date().toISOString(),
      end_time: null,
      duration_minutes: null,
      task: 'New task',
      work_category: 'Development',
      description: 'Starting now.',
      reference_links: null,
      deliverables: null,
    })

    render(<TimeTrackingPage />)
    await screen.findByRole('button', { name: 'Start Timer' })

    const timerSection = within(screen.getByRole('heading', { name: 'Timer' }).closest('section') as HTMLElement)

    await user.type(timerSection.getByPlaceholderText('Task'), 'New task')
    await user.type(timerSection.getByPlaceholderText('Work category'), 'Development')
    await user.type(timerSection.getByPlaceholderText('Description'), 'Starting now.')
    await user.click(timerSection.getByRole('button', { name: 'Start Timer' }))

    await waitFor(() => {
      expect(timeEntryApi.startTimer).toHaveBeenCalledWith({
        task: 'New task',
        work_category: 'Development',
        description: 'Starting now.',
        project_id: null,
        client_id: null,
      })
    })
  })

  it('displays field-level validation errors from a failed manual entry submission', async () => {
    const user = userEvent.setup()
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([])
    vi.mocked(timeEntryApi.createTimeEntry).mockRejectedValue(
      new ApiError(422, 'This time entry overlaps with an existing entry.', {
        start_time: ['This time entry overlaps with an existing entry.'],
      }),
    )

    render(<TimeTrackingPage />)
    await screen.findByRole('button', { name: 'Add Entry' })

    const form = manualEntrySection()

    await user.type(form.getByPlaceholderText('Task'), 'Overlap task')
    await user.type(form.getByPlaceholderText('Work category'), 'Development')
    await user.type(form.getByPlaceholderText('Description'), 'Should fail.')

    // date/datetime-local inputs aren't exposed via an accessible role/label; query by type.
    const container = screen
      .getByRole('heading', { name: /Add Manual Time Entry|Edit Time Entry/ })
      .closest('section') as HTMLElement
    const [dateEl, startEl, endEl] = Array.from(
      container.querySelectorAll('input[type="date"], input[type="datetime-local"]'),
    ) as HTMLInputElement[]

    await user.type(dateEl, '2026-01-14')
    await user.type(startEl, '2026-01-14T09:00')
    await user.type(endEl, '2026-01-14T10:00')

    await user.click(form.getByRole('button', { name: 'Add Entry' }))

    expect(await screen.findByText('This time entry overlaps with an existing entry.')).toBeInTheDocument()
  })

  it('disables edit and delete for a running entry', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 4,
        user_id: 1,
        project_id: null,
        client_id: null,
        department_id: null,
        date: '2026-01-14',
        start_time: new Date().toISOString(),
        end_time: null,
        duration_minutes: null,
        task: 'Live task',
        work_category: 'Development',
        description: 'Working now.',
        reference_links: null,
        deliverables: null,
      },
    ])

    render(<TimeTrackingPage />)
    await screen.findByRole('cell', { name: 'Live task' })

    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
