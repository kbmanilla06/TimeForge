import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createTimeEntry,
  deleteAttachment,
  deleteTimeEntry,
  downloadAttachment,
  getSummary,
  listClientsForSelf,
  listProjectsForSelf,
  listTimeEntries,
  startTimer,
  stopTimer,
  updateTimeEntry,
  uploadAttachment,
} from './timeEntryApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('timeEntryApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('listTimeEntries calls GET /api/time-entries', async () => {
    const entries = [{ id: 1, task: 'Test' }]
    const fetchMock = mockFetchOnce(entries)

    const result = await listTimeEntries()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries'),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(entries)
  })

  it('createTimeEntry posts the payload', async () => {
    const payload = {
      date: '2026-01-01',
      start_time: '2026-01-01 09:00:00',
      end_time: '2026-01-01 10:00:00',
      task: 'Do the thing',
      work_category: 'Development',
      description: 'Did the thing.',
    }
    const fetchMock = mockFetchOnce({ id: 1, ...payload }, 201)

    await createTimeEntry(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    )
  })

  it('updateTimeEntry patches the correct entry id', async () => {
    const fetchMock = mockFetchOnce({ id: 5 })

    await updateTimeEntry(5, {
      date: '2026-01-01',
      start_time: '2026-01-01 09:00:00',
      end_time: '2026-01-01 10:00:00',
      task: 'Updated',
      work_category: 'Development',
      description: 'Updated.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/5'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deleteTimeEntry calls DELETE on the correct entry id', async () => {
    const fetchMock = mockFetchOnce(null, 204)

    await deleteTimeEntry(9)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/9'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('startTimer posts to /time-entries/start', async () => {
    const fetchMock = mockFetchOnce({ id: 1, end_time: null }, 201)

    await startTimer({ task: 'Live task', work_category: 'Development', description: 'Working now.' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/start'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('stopTimer patches /time-entries/{id}/stop', async () => {
    const fetchMock = mockFetchOnce({ id: 3, end_time: '2026-01-01 10:00:00' })

    await stopTimer(3)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/3/stop'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('getSummary calls GET /api/time-entries/summary', async () => {
    const summary = {
      today_minutes: 60,
      week_minutes: 60,
      month_minutes: 60,
      payroll_period_minutes: 60,
      payroll_period_start: '2026-01-01',
      payroll_period_end: '2026-01-15',
    }
    const fetchMock = mockFetchOnce(summary)

    const result = await getSummary()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/summary'),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(summary)
  })

  it('listProjectsForSelf and listClientsForSelf call the non-admin catalog endpoints', async () => {
    const fetchMock = mockFetchOnce([])

    await listProjectsForSelf()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/projects'), expect.anything())

    await listClientsForSelf()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/clients'), expect.anything())
  })

  it('uploadAttachment posts FormData containing the file to the attachments endpoint', async () => {
    const fetchMock = mockFetchOnce({ id: 21, original_name: 'receipt.pdf' }, 201)
    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' })

    const result = await uploadAttachment(7, file)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/7/attachments'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('file')).toBe(file)
    expect(result).toEqual({ id: 21, original_name: 'receipt.pdf' })
  })

  it('downloadAttachment fetches the scoped download endpoint and resolves a blob', async () => {
    const blob = new Blob(['pdf-bytes'])
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob })
    vi.stubGlobal('fetch', fetchMock)

    const result = await downloadAttachment(7, 21)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/7/attachments/21/download'),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toBe(blob)
  })

  it('deleteAttachment calls DELETE on the scoped attachment', async () => {
    const fetchMock = mockFetchOnce(null, 204)

    await deleteAttachment(7, 21)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries/7/attachments/21'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
