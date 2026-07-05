import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as holidayApi from '../lib/holidayApi'
import * as leaveRequestApi from '../lib/leaveRequestApi'
import type { Holiday } from '../types/holiday'
import type { LeaveRequest } from '../types/leaveRequest'
import { TodayLeaveHolidayBanner } from './TodayLeaveHolidayBanner'

vi.mock('../lib/holidayApi')
vi.mock('../lib/leaveRequestApi')

const TODAY = new Date().toISOString().slice(0, 10)

function leaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 1,
    user_id: 1,
    start_date: TODAY,
    end_date: TODAY,
    leave_type: 'vacation',
    reason: null,
    status: 'approved',
    reviewed_by: 2,
    reviewed_at: TODAY,
    rejection_reason: null,
    ...overrides,
  }
}

function holiday(overrides: Partial<Holiday> = {}): Holiday {
  return { id: 1, date: TODAY, name: 'Company Holiday', created_by: 1, ...overrides }
}

describe('TodayLeaveHolidayBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows nothing when today is not a holiday and there is no approved leave', async () => {
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([])
    vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue([])

    const { container } = render(<TodayLeaveHolidayBanner />)

    await waitFor(() => expect(holidayApi.listHolidays).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a holiday banner when today matches a holiday date', async () => {
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([holiday({ name: 'Independence Day' })])
    vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue([])

    render(<TodayLeaveHolidayBanner />)

    expect(await screen.findByText('Today is a company holiday: Independence Day.')).toBeInTheDocument()
  })

  it('shows an approved-leave banner when today falls within an approved leave request', async () => {
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([])
    vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue([leaveRequest({ status: 'approved' })])

    render(<TodayLeaveHolidayBanner />)

    expect(await screen.findByText("You're on approved leave today.")).toBeInTheDocument()
  })

  it('ignores a pending or rejected leave request for today', async () => {
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([])
    vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue([
      leaveRequest({ status: 'pending' }),
      leaveRequest({ id: 2, status: 'rejected' }),
    ])

    const { container } = render(<TodayLeaveHolidayBanner />)

    await waitFor(() => expect(leaveRequestApi.listMyLeaveRequests).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('prefers the holiday message when both a holiday and approved leave apply today', async () => {
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([holiday({ name: 'Founding Day' })])
    vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue([leaveRequest({ status: 'approved' })])

    render(<TodayLeaveHolidayBanner />)

    expect(await screen.findByText('Today is a company holiday: Founding Day.')).toBeInTheDocument()
    expect(screen.queryByText("You're on approved leave today.")).not.toBeInTheDocument()
  })

  it('shows nothing when the fetch fails', async () => {
    vi.mocked(holidayApi.listHolidays).mockRejectedValue(new Error('network error'))
    vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue([])

    const { container } = render(<TodayLeaveHolidayBanner />)

    await waitFor(() => expect(holidayApi.listHolidays).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
