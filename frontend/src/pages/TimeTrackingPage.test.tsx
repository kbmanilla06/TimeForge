import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/apiClient'
import * as download from '../lib/download'
import * as kpiApi from '../lib/kpiApi'
import * as timeEntryApi from '../lib/timeEntryApi'
import * as timesheetApi from '../lib/timesheetApi'
import { TimeTrackingPage } from './TimeTrackingPage'

vi.mock('../lib/timeEntryApi')
vi.mock('../lib/timesheetApi')
vi.mock('../lib/kpiApi')
vi.mock('../lib/download')

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
    vi.mocked(timesheetApi.listMyTimesheets).mockResolvedValue([])
    vi.mocked(kpiApi.listMyAssignments).mockResolvedValue([])
  })

  it('renders the summary totals and existing entries', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        project_id: 1,
        client_id: null,
        department_id: null,
        timesheet_id: null,
        kpi_assignment_id: null,
        kpi_progress_value: null,
        task_status: null,
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
        timesheet_id: null,
        kpi_assignment_id: null,
        kpi_progress_value: null,
        task_status: null,
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
      timesheet_id: null,
      kpi_assignment_id: null,
      kpi_progress_value: null,
      task_status: null,
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
        kpi_assignment_id: null,
        kpi_progress_value: null,
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
        timesheet_id: null,
        kpi_assignment_id: null,
        kpi_progress_value: null,
        task_status: null,
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

  it('shows a Submit Timesheet button for a date with no timesheet yet, and submits it', async () => {
    const user = userEvent.setup()
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 5,
        user_id: 1,
        project_id: null,
        client_id: null,
        department_id: null,
        timesheet_id: null,
        kpi_assignment_id: null,
        kpi_progress_value: null,
        date: '2026-01-14',
        start_time: '2026-01-14 09:00:00',
        end_time: '2026-01-14 10:00:00',
        duration_minutes: 60,
        task: 'Unsubmitted work',
        task_status: null,
        work_category: 'Development',
        description: 'Not yet submitted.',
        reference_links: null,
        deliverables: null,
        timesheet: null,
      },
    ])
    vi.mocked(timesheetApi.submitTimesheet).mockResolvedValue({
      id: 1,
      user_id: 1,
      date: '2026-01-14',
      status: 'submitted',
      submitted_at: '2026-01-14T10:00:00Z',
      reviewed_by: null,
      reviewed_at: null,
    })

    render(<TimeTrackingPage />)
    await screen.findByText('Unsubmitted work')

    expect(screen.getByText('Status: not submitted')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Submit Timesheet' }))

    await waitFor(() => {
      expect(timesheetApi.submitTimesheet).toHaveBeenCalledWith({ date: '2026-01-14' })
    })
  })

  it('does not show a Submit Timesheet button once a date is submitted, and disables edit/delete', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 6,
        user_id: 1,
        project_id: null,
        client_id: null,
        department_id: null,
        timesheet_id: 1,
        kpi_assignment_id: null,
        kpi_progress_value: null,
        date: '2026-01-14',
        start_time: '2026-01-14 09:00:00',
        end_time: '2026-01-14 10:00:00',
        duration_minutes: 60,
        task: 'Submitted work',
        task_status: null,
        work_category: 'Development',
        description: 'Already submitted.',
        reference_links: null,
        deliverables: null,
        timesheet: { id: 1, status: 'submitted' },
      },
    ])
    vi.mocked(timesheetApi.listMyTimesheets).mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        date: '2026-01-14',
        status: 'submitted',
        submitted_at: '2026-01-14T10:00:00Z',
        reviewed_by: null,
        reviewed_at: null,
      },
    ])

    render(<TimeTrackingPage />)
    await screen.findByText('Submitted work')

    expect(screen.getByText('Status: submitted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit Timesheet' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('shows supervisor comments for a rejected timesheet', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      {
        id: 7,
        user_id: 1,
        project_id: null,
        client_id: null,
        department_id: null,
        timesheet_id: 1,
        kpi_assignment_id: null,
        kpi_progress_value: null,
        date: '2026-01-14',
        start_time: '2026-01-14 09:00:00',
        end_time: '2026-01-14 10:00:00',
        duration_minutes: 60,
        task: 'Needs fixes',
        task_status: null,
        work_category: 'Development',
        description: 'Rejected work.',
        reference_links: null,
        deliverables: null,
        timesheet: { id: 1, status: 'rejected' },
      },
    ])
    vi.mocked(timesheetApi.listMyTimesheets).mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        date: '2026-01-14',
        status: 'rejected',
        submitted_at: '2026-01-14T10:00:00Z',
        reviewed_by: 2,
        reviewed_at: '2026-01-14T11:00:00Z',
        comments: [
          {
            id: 1,
            timesheet_id: 1,
            author_id: 2,
            action: 'rejected',
            comment: 'Please add more detail.',
            author: { id: 2, name: 'Sam Supervisor' },
            created_at: '2026-01-14T11:00:00Z',
          },
        ],
      },
    ])

    render(<TimeTrackingPage />)

    expect(await screen.findByText(/Please add more detail\./)).toBeInTheDocument()
    expect(screen.getByText(/Sam Supervisor/)).toBeInTheDocument()
  })

  it('creates a manual entry linked to a selected KPI assignment with a progress value', async () => {
    const user = userEvent.setup()
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([])
    vi.mocked(kpiApi.listMyAssignments).mockResolvedValue([
      {
        id: 9,
        kpi_id: 4,
        user_id: 1,
        department_id: null,
        progress_value: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        kpi: { id: 4, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 2 },
      },
    ])
    vi.mocked(timeEntryApi.createTimeEntry).mockResolvedValue({
      id: 10,
      user_id: 1,
      project_id: null,
      client_id: null,
      department_id: null,
      timesheet_id: null,
      kpi_assignment_id: 9,
      kpi_progress_value: 2,
      task_status: null,
      date: '2026-01-14',
      start_time: '2026-01-14T09:00:00',
      end_time: '2026-01-14T10:00:00',
      duration_minutes: 60,
      task: 'Fix bugs',
      work_category: 'Development',
      description: 'Fixed some bugs.',
      reference_links: null,
      deliverables: null,
    })

    render(<TimeTrackingPage />)
    await screen.findByRole('button', { name: 'Add Entry' })
    const form = manualEntrySection()

    await user.type(form.getByLabelText('Start'), '2026-01-14T09:00')
    await user.type(form.getByLabelText('End'), '2026-01-14T10:00')
    await user.type(form.getByPlaceholderText('Task'), 'Fix bugs')
    await user.type(form.getByPlaceholderText('Work category'), 'Development')
    await user.type(form.getByPlaceholderText('Description'), 'Fixed some bugs.')

    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.type(dateInputs[0] as HTMLInputElement, '2026-01-14')

    await user.selectOptions(form.getByDisplayValue('— No KPI —'), '9')
    await user.type(form.getByPlaceholderText('KPI progress (e.g. 2)'), '2')
    await user.click(form.getByRole('button', { name: 'Add Entry' }))

    await waitFor(() => {
      expect(timeEntryApi.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({ kpi_assignment_id: 9, kpi_progress_value: 2 }),
      )
    })
  })

  it('disables the KPI progress input until a KPI assignment is selected', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([])
    vi.mocked(kpiApi.listMyAssignments).mockResolvedValue([
      {
        id: 9,
        kpi_id: 4,
        user_id: 1,
        department_id: null,
        progress_value: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        kpi: { id: 4, name: 'Bugs Resolved', target_value: 10, unit: 'bugs', created_by: 2 },
      },
    ])

    render(<TimeTrackingPage />)
    await screen.findByRole('button', { name: 'Add Entry' })
    const form = manualEntrySection()

    expect(form.getByPlaceholderText('KPI progress (e.g. 2)')).toBeDisabled()
  })

  const pdfAttachment = {
    id: 21,
    time_entry_id: 11,
    original_name: 'receipt.pdf',
    mime_type: 'application/pdf',
    size_bytes: 2048,
    uploaded_by: 1,
    created_at: '2026-01-14T10:00:00Z',
  }

  function attachableEntry(overrides: Record<string, unknown> = {}) {
    return {
      id: 11,
      user_id: 1,
      project_id: null,
      client_id: null,
      department_id: null,
      timesheet_id: null,
      kpi_assignment_id: null,
      kpi_progress_value: null,
      task_status: null,
      date: '2026-01-14',
      start_time: '2026-01-14 09:00:00',
      end_time: '2026-01-14 10:00:00',
      duration_minutes: 60,
      task: 'Attachable work',
      work_category: 'Development',
      description: 'Has files.',
      reference_links: null,
      deliverables: null,
      attachments: [],
      ...overrides,
    }
  }

  it('uploads an attachment to an editable entry and lists it', async () => {
    const user = userEvent.setup()
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([attachableEntry()])
    vi.mocked(timeEntryApi.uploadAttachment).mockResolvedValue(pdfAttachment)

    render(<TimeTrackingPage />)
    await screen.findByText('Attach file')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' }))

    expect(await screen.findByRole('button', { name: 'receipt.pdf' })).toBeInTheDocument()
    expect(screen.getByText('(2 KB)')).toBeInTheDocument()
    expect(timeEntryApi.uploadAttachment).toHaveBeenCalledWith(11, expect.any(File))
  })

  it('downloads an attachment using its original filename', async () => {
    const user = userEvent.setup()
    const blob = new Blob(['pdf-bytes'])
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      attachableEntry({ attachments: [pdfAttachment] }),
    ])
    vi.mocked(timeEntryApi.downloadAttachment).mockResolvedValue(blob)

    render(<TimeTrackingPage />)
    await user.click(await screen.findByRole('button', { name: 'receipt.pdf' }))

    await waitFor(() => {
      expect(timeEntryApi.downloadAttachment).toHaveBeenCalledWith(11, 21)
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'receipt.pdf')
    })
  })

  it('removes an attachment from an editable entry', async () => {
    const user = userEvent.setup()
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      attachableEntry({ attachments: [pdfAttachment] }),
    ])
    vi.mocked(timeEntryApi.deleteAttachment).mockResolvedValue(null)

    render(<TimeTrackingPage />)
    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(timeEntryApi.deleteAttachment).toHaveBeenCalledWith(11, 21)
    })
    expect(screen.queryByRole('button', { name: 'receipt.pdf' })).not.toBeInTheDocument()
  })

  it('hides attach and remove controls once the entry is locked, but keeps download', async () => {
    vi.mocked(timeEntryApi.listTimeEntries).mockResolvedValue([
      attachableEntry({
        timesheet_id: 1,
        timesheet: { id: 1, status: 'submitted' },
        attachments: [pdfAttachment],
      }),
    ])

    render(<TimeTrackingPage />)

    expect(await screen.findByRole('button', { name: 'receipt.pdf' })).toBeInTheDocument()
    expect(screen.queryByText('Attach file')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })
})
