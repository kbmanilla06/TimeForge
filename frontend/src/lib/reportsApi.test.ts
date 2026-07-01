import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportTeamHoursExcel, exportTeamHoursPdf } from './reportsApi'

function mockBlobFetchOnce(blob: Blob, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    blob: async () => blob,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('reportsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('exportTeamHoursPdf calls GET /api/team-hours-report/export/pdf', async () => {
    const blob = new Blob(['pdf'])
    const fetchMock = mockBlobFetchOnce(blob)

    const result = await exportTeamHoursPdf('2026-01-10')

    expect(result).toBe(blob)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/team-hours-report/export/pdf?date=2026-01-10'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('exportTeamHoursExcel calls GET /api/team-hours-report/export/excel', async () => {
    const blob = new Blob(['xlsx'])
    const fetchMock = mockBlobFetchOnce(blob)

    const result = await exportTeamHoursExcel()

    expect(result).toBe(blob)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/team-hours-report\/export\/excel$/),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
