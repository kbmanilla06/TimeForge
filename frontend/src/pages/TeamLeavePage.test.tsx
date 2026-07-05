import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as leaveRequestApi from '../lib/leaveRequestApi'
import type { LeaveRequest } from '../types/leaveRequest'
import { TeamLeavePage } from './TeamLeavePage'

vi.mock('../lib/leaveRequestApi')

const PENDING: LeaveRequest = {
  id: 1,
  user_id: 5,
  start_date: '2026-08-01',
  end_date: '2026-08-03',
  leave_type: 'vacation',
  reason: 'Family trip',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  user: { id: 5, name: 'Jane Employee' },
}

function mockList(requests: LeaveRequest[]) {
  vi.mocked(leaveRequestApi.listTeamLeaveRequests).mockResolvedValue(requests)
}

describe('TeamLeavePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a pending request with employee name and reason', async () => {
    mockList([PENDING])
    render(<TeamLeavePage />)

    expect(await screen.findByText('Jane Employee')).toBeInTheDocument()
    expect(screen.getByText('Family trip')).toBeInTheDocument()
    expect(screen.getByText('vacation')).toBeInTheDocument()
  })

  it('approves a request and refreshes the list', async () => {
    const user = userEvent.setup()
    mockList([PENDING])
    vi.mocked(leaveRequestApi.approveLeaveRequest).mockResolvedValue({ ...PENDING, status: 'approved' })

    render(<TeamLeavePage />)
    await user.click(await screen.findByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(leaveRequestApi.approveLeaveRequest).toHaveBeenCalledWith(1))
    expect(leaveRequestApi.listTeamLeaveRequests).toHaveBeenCalledTimes(2)
  })

  it('rejects a request with an optional reason', async () => {
    const user = userEvent.setup()
    mockList([PENDING])
    vi.mocked(leaveRequestApi.rejectLeaveRequest).mockResolvedValue({ ...PENDING, status: 'rejected' })

    render(<TeamLeavePage />)
    await user.type(
      await screen.findByPlaceholderText('Rejection reason (optional)'),
      'Not enough coverage',
    )
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() =>
      expect(leaveRequestApi.rejectLeaveRequest).toHaveBeenCalledWith(1, {
        rejection_reason: 'Not enough coverage',
      }),
    )
  })

  it('shows an empty-state message when there is nothing to review', async () => {
    mockList([])
    render(<TeamLeavePage />)

    expect(await screen.findByText('No leave requests to review.')).toBeInTheDocument()
  })

  it('shows the reviewer and rejection reason for a decided request', async () => {
    mockList([
      {
        ...PENDING,
        status: 'rejected',
        reviewed_by: 9,
        rejection_reason: 'Too many out that week.',
        reviewer: { id: 9, name: 'Ada Admin' },
      },
    ])
    render(<TeamLeavePage />)

    expect(await screen.findByText('By Ada Admin')).toBeInTheDocument()
    expect(screen.getByText('“Too many out that week.”')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})
