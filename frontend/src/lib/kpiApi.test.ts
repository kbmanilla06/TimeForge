import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAssignment,
  createKpi,
  deleteAssignment,
  listKpis,
  listMyAssignments,
  listTeamAssignments,
  listTeamMembers,
} from './kpiApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('kpiApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('listKpis calls GET /api/kpis', async () => {
    const fetchMock = mockFetchOnce([])

    await listKpis()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/kpis'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('createKpi posts to /api/admin/kpis', async () => {
    const fetchMock = mockFetchOnce({ id: 1, name: 'Bugs Resolved' }, 201)

    await createKpi({ name: 'Bugs Resolved', target_value: 10, unit: 'bugs' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/kpis'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Bugs Resolved', target_value: 10, unit: 'bugs' }),
      }),
    )
  })

  it('listMyAssignments calls GET /api/kpi-assignments/mine', async () => {
    const fetchMock = mockFetchOnce([])

    await listMyAssignments()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/kpi-assignments/mine'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('listTeamAssignments calls GET /api/kpi-assignments/team', async () => {
    const fetchMock = mockFetchOnce([])

    await listTeamAssignments()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/kpi-assignments/team'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('createAssignment posts to /api/kpi-assignments', async () => {
    const fetchMock = mockFetchOnce({ id: 1, kpi_id: 1, user_id: 2 }, 201)

    await createAssignment({ kpi_id: 1, user_id: 2 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/kpi-assignments'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ kpi_id: 1, user_id: 2 }) }),
    )
  })

  it('deleteAssignment deletes /api/kpi-assignments/{id}', async () => {
    const fetchMock = mockFetchOnce(null, 204)

    await deleteAssignment(1)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/kpi-assignments/1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('listTeamMembers calls GET /api/team-members', async () => {
    const fetchMock = mockFetchOnce([])

    await listTeamMembers()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/team-members'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
