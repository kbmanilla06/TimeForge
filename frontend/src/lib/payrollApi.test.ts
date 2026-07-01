import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportPayrollExcel, exportPayrollPdf, getPayrollSummary } from './payrollApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockBlobFetchOnce(blob: Blob, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    blob: async () => blob,
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

  it('exportPayrollPdf calls GET /api/payroll/export/pdf and resolves to a Blob', async () => {
    const blob = new Blob(['pdf'])
    const fetchMock = mockBlobFetchOnce(blob)

    const result = await exportPayrollPdf('2026-01-10')

    expect(result).toBe(blob)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/payroll/export/pdf?date=2026-01-10'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('exportPayrollExcel calls GET /api/payroll/export/excel and resolves to a Blob', async () => {
    const blob = new Blob(['xlsx'])
    const fetchMock = mockBlobFetchOnce(blob)

    const result = await exportPayrollExcel()

    expect(result).toBe(blob)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/payroll\/export\/excel$/),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
