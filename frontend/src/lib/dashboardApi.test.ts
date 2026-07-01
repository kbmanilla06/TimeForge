import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDashboard } from './dashboardApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('dashboardApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('getDashboard calls GET /api/dashboard with no query by default', async () => {
    const fetchMock = mockFetchOnce({})

    await getDashboard()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/dashboard$/),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getDashboard includes the date query param when given', async () => {
    const fetchMock = mockFetchOnce({})

    await getDashboard('2026-01-10')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard?date=2026-01-10'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
