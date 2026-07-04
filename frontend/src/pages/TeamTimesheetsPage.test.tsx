import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as dashboardApi from '../lib/dashboardApi'
import * as download from '../lib/download'
import * as reportsApi from '../lib/reportsApi'
import * as timeEntryApi from '../lib/timeEntryApi'
import * as timesheetApi from '../lib/timesheetApi'
import type { DashboardData } from '../types/dashboard'
import { TeamTimesheetsPage } from './TeamTimesheetsPage'

vi.mock('../lib/timesheetApi')
vi.mock('../lib/reportsApi')
vi.mock('../lib/dashboardApi')
vi.mock('../lib/download')
vi.mock('../lib/timeEntryApi')

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const emptyDashboard: DashboardData = {
  scope: 'department',
  department_name: 'Engineering',
  period_start: '2026-07-01',
  period_end: '2026-07-15',
  total_hours_minutes: 0,
  employee_productivity: [],
  department_performance: [],
  pending_approvals: 0,
  kpi_completion_rates: [],
  attendance_trends: [],
  billable_minutes: 0,
  non_billable_minutes: 0,
  project_allocation: [],
}

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

async function expandJaneEmployee() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /Jane Employee/ }))
  return user
}

describe('TeamTimesheetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(emptyDashboard)
    vi.mocked(reportsApi.getTeamHoursTrend).mockResolvedValue([])
  })

  it('renders employee groups with a total and expands to show entries', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet])

    render(<TeamTimesheetsPage />)

    expect(await screen.findByText('Jane Employee')).toBeInTheDocument()
    expect(screen.getByText('1h 0m total · 1 day')).toBeInTheDocument()
    expect(screen.queryByText(/Build feature/)).not.toBeInTheDocument()

    await expandJaneEmployee()

    expect(await screen.findByText(/Build feature/)).toBeInTheDocument()
    expect(screen.getByText('Status: submitted')).toBeInTheDocument()
  })

  it('sums total hours across multiple days for the same employee', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      submittedTimesheet,
      { ...submittedTimesheet, id: 2, date: '2026-01-15' },
    ])

    render(<TeamTimesheetsPage />)

    expect(await screen.findByText('2h 0m total · 2 days')).toBeInTheDocument()
  })

  it('approves a submitted timesheet with the typed comment', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet]);
    (vi.mocked(timesheetApi.approveTimesheet) as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...submittedTimesheet,
      status: 'approved',
    })

    render(<TeamTimesheetsPage />)
    const user = await expandJaneEmployee()

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
    await expandJaneEmployee()

    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument()
  })

  it('does not show a Reopen button to supervisors', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      { ...submittedTimesheet, status: 'approved' as const },
    ])

    render(<TeamTimesheetsPage />)
    await expandJaneEmployee()

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
    await expandJaneEmployee()

    expect(await screen.findByText(/Missing details\./)).toBeInTheDocument()
    expect(screen.getByText(/Sam Supervisor/)).toBeInTheDocument()
  })

  it('filters grouped timesheets by status', async () => {
    const user = userEvent.setup()
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      submittedTimesheet,
      { ...submittedTimesheet, id: 2, user_id: 3, user: { id: 3, name: 'Alex Approved' }, status: 'approved' as const },
    ])

    render(<TeamTimesheetsPage />)
    await screen.findByText('Jane Employee')
    expect(screen.getByText('Alex Approved')).toBeInTheDocument()

    await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'approved')

    expect(screen.queryByText('Jane Employee')).not.toBeInTheDocument()
    expect(screen.getByText('Alex Approved')).toBeInTheDocument()
  })

  it('filters grouped timesheets by date range', async () => {
    const user = userEvent.setup()
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([
      submittedTimesheet,
      { ...submittedTimesheet, id: 2, user_id: 3, user: { id: 3, name: 'Later Employee' }, date: '2026-02-01' },
    ])

    render(<TeamTimesheetsPage />)
    await screen.findByText('Jane Employee')

    await user.type(screen.getByLabelText('From date'), '2026-01-20')

    expect(screen.queryByText('Jane Employee')).not.toBeInTheDocument()
    expect(screen.getByText('Later Employee')).toBeInTheDocument()
  })

  it('shows an empty state distinct from "no filter matches"', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([])

    render(<TeamTimesheetsPage />)

    expect(await screen.findByText('No team timesheets yet.')).toBeInTheDocument()
  })

  it('renders dashboard-backed analytics', async () => {
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet])
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      ...emptyDashboard,
      total_hours_minutes: 120,
      kpi_completion_rates: [
        {
          kpi_assignment_id: 1,
          department_id: 7,
          kpi_name: 'Bugs Resolved',
          target: 10,
          progress: 5,
          completion_rate: 50,
          assignee: 'Jane Employee',
        },
      ],
    })

    render(<TeamTimesheetsPage />)

    expect(await screen.findByText('2.00')).toBeInTheDocument()
    expect(screen.getByText(/Bugs Resolved — Jane Employee/)).toBeInTheDocument()
    expect(screen.getByText('Department Progress')).toBeInTheDocument()
    expect(screen.getByText('Employee Progress')).toBeInTheDocument()
    expect(screen.getByText('Attendance Trend')).toBeInTheDocument()
    expect(screen.getByText('Productivity Trend')).toBeInTheDocument()
  })

  it('exports the team hours report as PDF and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(timesheetApi.listTeamTimesheets).mockResolvedValue([submittedTimesheet])
    const blob = new Blob(['pdf'])
    vi.mocked(reportsApi.exportTeamHoursPdf).mockResolvedValue(blob)

    render(<TeamTimesheetsPage />)
    await screen.findByText('Jane Employee')

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
    await screen.findByText('Jane Employee')

    await user.click(screen.getByRole('button', { name: 'Export Hours Excel' }))

    await waitFor(() => {
      expect(reportsApi.exportTeamHoursExcel).toHaveBeenCalled()
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'team-hours-report.xlsx')
    })
  })

  it('lists entry attachments as download-only links', async () => {
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
    const user = await expandJaneEmployee()

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
