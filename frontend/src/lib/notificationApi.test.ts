import { afterEach, describe, expect, it, vi } from 'vitest'
import { listNotifications, markNotificationRead } from './notificationApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('notificationApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('listNotifications calls GET /api/notifications', async () => {
    const fetchMock = mockFetchOnce([])

    await listNotifications()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('markNotificationRead patches the correct notification id', async () => {
    const fetchMock = mockFetchOnce({ id: 'abc-123', read_at: '2026-01-14T10:00:00Z' })

    await markNotificationRead('abc-123')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications/abc-123/read'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
