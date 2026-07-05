import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as auditLogApi from '../../lib/auditLogApi'
import type { AuditLog, PaginatedAuditLogs } from '../../types/auditLog'
import { AuditLogsPage } from './AuditLogsPage'

vi.mock('../../lib/auditLogApi')

const ENTRY: AuditLog = {
  id: 1,
  actor_id: 5,
  actor: { id: 5, name: 'Ada Admin', email: 'ada@company.com' },
  action: 'user.activated',
  subject_type: 'App\\Models\\User',
  subject_id: 10,
  metadata: { note: 'reinstated' },
  ip_address: '127.0.0.1',
  created_at: '2026-07-01T00:00:00Z',
}

function mockList(page: Partial<PaginatedAuditLogs>) {
  vi.mocked(auditLogApi.listAuditLogs).mockResolvedValue({
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
    ...page,
  })
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an audit entry with actor, action, subject, and metadata', async () => {
    mockList({ data: [ENTRY] })
    render(<AuditLogsPage />)

    expect(await screen.findByText('Ada Admin')).toBeInTheDocument()
    expect(screen.getByText('user.activated')).toBeInTheDocument()
    expect(screen.getByText('User #10')).toBeInTheDocument()
    expect(screen.getByText('{"note":"reinstated"}')).toBeInTheDocument()
  })

  it('shows a dash for entries with no authenticated actor', async () => {
    mockList({ data: [{ ...ENTRY, actor_id: null, actor: null }] })
    render(<AuditLogsPage />)

    await screen.findByText('user.activated')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('re-queries with the action filter as the admin types', async () => {
    const user = userEvent.setup()
    mockList({ data: [ENTRY] })
    render(<AuditLogsPage />)

    await screen.findByText('user.activated')
    await user.type(screen.getByLabelText('Filter by action'), 'login.failed')

    await waitFor(() =>
      expect(auditLogApi.listAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'login.failed' }),
      ),
    )
  })

  it('shows an empty-state message when nothing matches', async () => {
    mockList({ data: [] })
    render(<AuditLogsPage />)

    expect(await screen.findByText('No audit log entries match this view.')).toBeInTheDocument()
  })

  it('paginates using the last_page from the response', async () => {
    const user = userEvent.setup()
    mockList({ data: [ENTRY], current_page: 1, last_page: 2 })
    render(<AuditLogsPage />)

    await screen.findByText('user.activated')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(auditLogApi.listAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    )
  })
})
