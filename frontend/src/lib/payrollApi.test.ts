import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPayrollSummary } from './payrollApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('payrollApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('getPayrollSummary calls GET /api/payroll with no query by default', async () => {
    const fetchMock = mockFetchOnce([])

    await getPayrollSummary()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/payroll$/),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getPayrollSummary includes the date query param when given', async () => {
    const fetchMock = mockFetchOnce([])

    await getPayrollSummary('2026-01-10')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/payroll?date=2026-01-10'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
