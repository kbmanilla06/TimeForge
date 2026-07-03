import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountRequestApi from '../../lib/accountRequestApi'
import type { AccountRequest } from '../../types/accountRequest'
import { AccountRequestsPage } from './AccountRequestsPage'

vi.mock('../../lib/accountRequestApi')

const SUBMITTED: AccountRequest = {
  id: 1,
  status: 'submitted',
  terms_accepted_at: '2026-07-01T00:00:00Z',
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: '2026-07-01T00:00:00Z',
  user: {
    id: 10,
    name: 'Jane Applicant',
    email: 'jane@company.com',
    employee_id: 'EMP-1',
    position: 'Engineer',
    contact_number: '555-0100',
    department: { id: 1, name: 'Engineering' },
  },
  reviewer: null,
}

const REJECTED: AccountRequest = {
  ...SUBMITTED,
  id: 2,
  status: 'rejected',
  reviewed_by: 99,
  reviewed_at: '2026-07-02T00:00:00Z',
  rejection_reason: 'Could not verify employment.',
  user: { ...SUBMITTED.user, id: 11, name: 'Rex Rejected', email: 'rex@company.com' },
  reviewer: { id: 99, name: 'Ada Admin' },
}

function mockList(requests: AccountRequest[]) {
  vi.mocked(accountRequestApi.listAccountRequests).mockResolvedValue(requests)
}

describe('AccountRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders applicant details for a submitted request', async () => {
    mockList([SUBMITTED])
    render(<AccountRequestsPage />)

    expect(await screen.findByText('Jane Applicant')).toBeInTheDocument()
    expect(screen.getByText('jane@company.com')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText('submitted')).toBeInTheDocument()
  })

  it('shows the reviewer, decision timestamp, and remark for a decided request', async () => {
    mockList([REJECTED])
    render(<AccountRequestsPage />)

    expect(await screen.findByText('Rex Rejected')).toBeInTheDocument()
    expect(screen.getByText(/By Ada Admin on/)).toBeInTheDocument()
    expect(screen.getByText('“Could not verify employment.”')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('re-queries with the search term as the admin types', async () => {
    const user = userEvent.setup()
    mockList([SUBMITTED])
    render(<AccountRequestsPage />)

    await screen.findByText('Jane Applicant')
    await user.type(screen.getByLabelText('Search applicants'), 'Jane')

    await waitFor(() =>
      expect(accountRequestApi.listAccountRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Jane' }),
      ),
    )
  })

  it('re-queries with the status filter when changed', async () => {
    const user = userEvent.setup()
    mockList([SUBMITTED])
    render(<AccountRequestsPage />)

    await screen.findByText('Jane Applicant')
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'rejected')

    await waitFor(() =>
      expect(accountRequestApi.listAccountRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'rejected' }),
      ),
    )
  })

  it('approves a request and refreshes the list', async () => {
    const user = userEvent.setup()
    mockList([SUBMITTED])
    vi.mocked(accountRequestApi.approveAccountRequest).mockResolvedValue({
      ...SUBMITTED,
      status: 'approved',
    })
    render(<AccountRequestsPage />)

    await user.click(await screen.findByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(accountRequestApi.approveAccountRequest).toHaveBeenCalledWith(1))
    expect(accountRequestApi.listAccountRequests).toHaveBeenCalledTimes(2)
  })

  it('rejects a request with optional remarks', async () => {
    const user = userEvent.setup()
    mockList([SUBMITTED])
    vi.mocked(accountRequestApi.rejectAccountRequest).mockResolvedValue({
      ...SUBMITTED,
      status: 'rejected',
    })
    render(<AccountRequestsPage />)

    await user.type(
      await screen.findByPlaceholderText('Rejection remarks (optional)'),
      'Not a real employee',
    )
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() =>
      expect(accountRequestApi.rejectAccountRequest).toHaveBeenCalledWith(1, 'Not a real employee'),
    )
  })

  it('shows an empty-state message when nothing matches', async () => {
    mockList([])
    render(<AccountRequestsPage />)

    expect(await screen.findByText('No account requests match this view.')).toBeInTheDocument()
  })
})
