import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as download from '../lib/download'
import * as reportsApi from '../lib/reportsApi'
import * as timeEntryApi from '../lib/timeEntryApi'
import * as timesheetApi from '../lib/timesheetApi'
import { TeamTimesheetsPage } from './TeamTimesheetsPage'

vi.mock('../lib/timesheetApi')
vi.mock('../lib/reportsApi')
vi.mock('../lib/download')
vi.mock('../lib/timeEntryApi')

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const submittedTimesheet = {
  id: 1,
  user_id: 2,
  date: '2026-01-14',
  status: 'submitted' as const,
  submitted_at: '2026-01-14T09:00:00Z',
  reviewed_by: null,
  reviewed_at: null,
  user: { id: 2, name: 'Jane Employee' },
  time_entries: [
    {
      id: 10,
      user_id: 2,
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
      task: 'Build feature',
      task_status: null,
      work_category: 'Development',
      description: 'Did it.',
      reference_links: null,
      deliverables: null,
    },
  ],
  comments: [],
}

describe('TeamTimesheetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })
  })

  it('renders team timesheets with employee, date, status, and entries', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet])

    render(<TeamTimesheetsPage />)

    expect(await screen.findByText(/Jane Employee/)).toBeInTheDocument()
    expect(screen.getByText(/Build feature/)).toBeInTheDocument()
    expect(screen.getByText('Status: submitted')).toBeInTheDocument()
  })

  it('approves a submitted timesheet with the typed comment', async () => {
    const user = userEvent.setup()
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet]);
    (vi.mocked(timesheetApi.approveTimesheet) as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...submittedTimesheet,
      status: 'approved',
    })

    render(<TeamTimesheetsPage />)
    await screen.findByText(/Jane Employee/)

    await user.type(screen.getByPlaceholderText(/Comment/), 'Looks good.')
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(timesheetApi.approveTimesheet).toHaveBeenCalledWith(1, { comment: 'Looks good.' })
    })
  })

  it('shows a Reopen button for approved timesheets only to admins', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      { ...submittedTimesheet, status: 'approved' as const },
    ])

    render(<TeamTimesheetsPage />)

    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument()
  })

  it('does not show a Reopen button to supervisors', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      { ...submittedTimesheet, status: 'approved' as const },
    ])

    render(<TeamTimesheetsPage />)
    await screen.findByText(/Jane Employee/)

    expect(screen.queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument()
  })

  it('renders comment history when present', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      {
        ...submittedTimesheet,
        status: 'rejected' as const,
        comments: [
          {
            id: 1,
            timesheet_id: 1,
            author_id: 3,
            action: 'rejected' as const,
            comment: 'Missing details.',
            author: { id: 3, name: 'Sam Supervisor' },
            created_at: '2026-01-14T10:00:00Z',
          },
        ],
      },
    ])

    render(<TeamTimesheetsPage />)

    expect(await screen.findByText(/Missing details\./)).toBeInTheDocument()
    expect(screen.getByText(/Sam Supervisor/)).toBeInTheDocument()
  })

  it('exports the team hours report as PDF and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet])
    const blob = new Blob(['pdf'])
    vi.mocked(reportsApi.exportTeamHoursPdf).mockResolvedValue(blob)

    render(<TeamTimesheetsPage />)
    await screen.findByText(/Jane Employee/)

    await user.click(screen.getByRole('button', { name: 'Export Hours PDF' }))

    await waitFor(() => {
      expect(reportsApi.exportTeamHoursPdf).toHaveBeenCalled()
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'team-hours-report.pdf')
    })
  })

  it('exports the team hours report as Excel and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet])
    const blob = new Blob(['xlsx'])
    vi.mocked(reportsApi.exportTeamHoursExcel).mockResolvedValue(blob)

    render(<TeamTimesheetsPage />)
    await screen.findByText(/Jane Employee/)

    await user.click(screen.getByRole('button', { name: 'Export Hours Excel' }))

    await waitFor(() => {
      expect(reportsApi.exportTeamHoursExcel).toHaveBeenCalled()
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'team-hours-report.xlsx')
    })
  })

  it('lists entry attachments as download-only links', async () => {
    const user = userEvent.setup()
    const blob = new Blob(['pdf-bytes'])
    vi.mocked(timeEntryApi.downloadAttachment).mockResolvedValue(blob)
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      {
        ...submittedTimesheet,
        time_entries: [
          {
            ...submittedTimesheet.time_entries[0],
            attachments: [
              {
                id: 21,
                time_entry_id: 10,
                original_name: 'receipt.pdf',
                mime_type: 'application/pdf',
                size_bytes: 2048,
                uploaded_by: 2,
                created_at: '2026-01-14T10:00:00Z',
              },
            ],
          },
        ],
      },
    ])

    render(<TeamTimesheetsPage />)

    await user.click(await screen.findByRole('button', { name: 'receipt.pdf' }))

    await waitFor(() => {
      expect(timeEntryApi.downloadAttachment).toHaveBeenCalledWith(10, 21)
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'receipt.pdf')
    })
    // Reviewers get download only — no upload or removal controls.
    expect(screen.queryByText('Attach file')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })
})
