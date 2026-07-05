import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as leaveRequestApi from '../lib/leaveRequestApi'
import type { LeaveRequest } from '../types/leaveRequest'
import { MyLeavePage } from './MyLeavePage'

vi.mock('../lib/leaveRequestApi')

const PENDING: LeaveRequest = {
  id: 1,
  user_id: 1,
  start_date: '2026-08-01',
  end_date: '2026-08-03',
  leave_type: 'vacation',
  reason: 'Family trip',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
}

const REJECTED: LeaveRequest = {
  ...PENDING,
  id: 2,
  status: 'rejected',
  reviewed_by: 9,
  reviewed_at: '2026-07-20T00:00:00Z',
  rejection_reason: 'Insufficient coverage.',
  reviewer: { id: 9, name: 'Sam Supervisor' },
}

function mockList(requests: LeaveRequest[]) {
  vi.mocked(leaveRequestApi.listMyLeaveRequests).mockResolvedValue(requests)
}

describe('MyLeavePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders own leave requests with status', async () => {
    mockList([PENDING])
    render(<MyLeavePage />)

    expect(await screen.findByText('vacation')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('shows the rejection reason for a rejected request', async () => {
    mockList([REJECTED])
    render(<MyLeavePage />)

    expect(await screen.findByText('“Insufficient coverage.”')).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no requests yet', async () => {
    mockList([])
    render(<MyLeavePage />)

    expect(await screen.findByText('No leave requests yet.')).toBeInTheDocument()
  })

  it('submits a new leave request and reloads the list', async () => {
    const user = userEvent.setup()
    mockList([])
    vi.mocked(leaveRequestApi.submitLeaveRequest).mockResolvedValue({ ...PENDING, id: 3 })

    render(<MyLeavePage />)
    await screen.findByText('No leave requests yet.')

    await user.type(screen.getByLabelText('Start Date'), '2026-09-01')
    await user.type(screen.getByLabelText('End Date'), '2026-09-02')
    await user.selectOptions(screen.getByLabelText('Leave Type'), 'sick')
    await user.type(screen.getByLabelText('Reason (optional)'), 'Not feeling well')
    await user.click(screen.getByRole('button', { name: 'Submit Request' }))

    await waitFor(() =>
      expect(leaveRequestApi.submitLeaveRequest).toHaveBeenCalledWith({
        start_date: '2026-09-01',
        end_date: '2026-09-02',
        leave_type: 'sick',
        reason: 'Not feeling well',
      }),
    )
    expect(leaveRequestApi.listMyLeaveRequests).toHaveBeenCalledTimes(2)
  })

  it('shows a validation error from the server', async () => {
    const user = userEvent.setup()
    mockList([])
    const { ApiError } = await import('../lib/apiClient')
    vi.mocked(leaveRequestApi.submitLeaveRequest).mockRejectedValue(
      new ApiError(422, 'The end date must be a date after or equal to start date.', {
        end_date: ['The end date must be a date after or equal to start date.'],
      }),
    )

    render(<MyLeavePage />)
    await screen.findByText('No leave requests yet.')

    await user.type(screen.getByLabelText('Start Date'), '2026-09-05')
    await user.type(screen.getByLabelText('End Date'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Submit Request' }))

    expect(
      await screen.findByText('The end date must be a date after or equal to start date.'),
    ).toBeInTheDocument()
  })
})
