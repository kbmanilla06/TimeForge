import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  approveTimesheet,
  listTeamTimesheets,
  rejectTimesheet,
  reopenTimesheet,
  requestRevision,
  submitTimesheet,
} from './timesheetApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('timesheetApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('submitTimesheet posts the date payload', async () => {
    const timesheet = { id: 1, status: 'submitted' }
    const fetchMock = mockFetchOnce(timesheet, 201)

    await submitTimesheet({ date: '2026-01-14' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/timesheets'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ date: '2026-01-14' }) }),
    )
  })

  it('listTeamTimesheets calls GET /api/timesheets/team', async () => {
    const fetchMock = mockFetchOnce([])

    await listTeamTimesheets()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/timesheets/team'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('approveTimesheet patches the approve endpoint', async () => {
    const fetchMock = mockFetchOnce({ id: 1, status: 'approved' })

    await approveTimesheet(1, { comment: 'Nice work.' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/timesheets/1/approve'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('rejectTimesheet patches the reject endpoint', async () => {
    const fetchMock = mockFetchOnce({ id: 1, status: 'rejected' })

    await rejectTimesheet(1, { comment: 'Missing details.' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/timesheets/1/reject'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('requestRevision patches the request-revision endpoint', async () => {
    const fetchMock = mockFetchOnce({ id: 1, status: 'revision_requested' })

    await requestRevision(1, { comment: 'Please fix.' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/timesheets/1/request-revision'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('reopenTimesheet patches the reopen endpoint', async () => {
    const fetchMock = mockFetchOnce({ id: 1, status: 'revision_requested' })

    await reopenTimesheet(1, { comment: 'Correction needed.' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/timesheets/1/reopen'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
