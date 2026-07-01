import { afterEach, describe, expect, it, vi } from 'vitest'
import { addScrumComment, getScrum, listMyScrums, listTeamScrums, submitScrum } from './scrumApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('scrumApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('listMyScrums calls GET /api/daily-scrums', async () => {
    const fetchMock = mockFetchOnce([])

    await listMyScrums()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-scrums'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getScrum calls GET /api/daily-scrums/{id}', async () => {
    const fetchMock = mockFetchOnce({ id: 1 })

    await getScrum(1)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-scrums/1'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('submitScrum posts the entry payload', async () => {
    const fetchMock = mockFetchOnce({ id: 1 }, 201)

    await submitScrum({
      date: '2026-01-14',
      previous_work: 'Finished login.',
      planned_work: 'Start dashboard.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-scrums'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          date: '2026-01-14',
          previous_work: 'Finished login.',
          planned_work: 'Start dashboard.',
        }),
      }),
    )
  })

  it('listTeamScrums calls GET /api/daily-scrums/team', async () => {
    const fetchMock = mockFetchOnce([])

    await listTeamScrums()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-scrums/team'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('addScrumComment posts to /api/daily-scrums/{id}/comments', async () => {
    const fetchMock = mockFetchOnce({ id: 1 }, 201)

    await addScrumComment(1, { comment: 'Nice progress.' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-scrums/1/comments'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ comment: 'Nice progress.' }) }),
    )
  })
})
