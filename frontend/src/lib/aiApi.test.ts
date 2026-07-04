import { afterEach, describe, expect, it, vi } from 'vitest'
import { askAssistant, generateAiOutput, listAiOutputs } from './aiApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('aiApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('listAiOutputs calls GET /api/ai-outputs with type, date, and user_id and unwraps outputs', async () => {
    const fetchMock = mockFetchOnce({ outputs: [{ id: 1 }] })

    const result = await listAiOutputs({ type: 'daily_work_summary', date: '2026-01-05', user_id: 7 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai-outputs?type=daily_work_summary&date=2026-01-05&user_id=7'),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual([{ id: 1 }])
  })

  it('listAiOutputs sends department_id for a recurring blockers query', async () => {
    const fetchMock = mockFetchOnce({ outputs: [] })

    await listAiOutputs({ type: 'recurring_blockers', date: '2026-01-05', department_id: 3 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('department_id=3'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('generateAiOutput POSTs the query as the request body', async () => {
    const fetchMock = mockFetchOnce({ id: 2 })

    const result = await generateAiOutput({
      type: 'weekly_productivity_report',
      date: '2026-06-03',
      user_id: 7,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ai-outputs$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'weekly_productivity_report', date: '2026-06-03', user_id: 7 }),
      }),
    )
    expect(result).toEqual({ id: 2 })
  })

  it('askAssistant POSTs the question as the request body', async () => {
    const fetchMock = mockFetchOnce({ question: "What is my team's progress?", category: 'team_progress' })

    const result = await askAssistant("What is my team's progress?")

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ai-assistant\/ask$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: "What is my team's progress?" }),
      }),
    )
    expect(result).toEqual({ question: "What is my team's progress?", category: 'team_progress' })
  })
})
