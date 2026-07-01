import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  activateUser,
  createDepartment,
  createProject,
  deleteClient,
  deleteDepartment,
  listUsers,
  updateProject,
} from './adminApi'

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('adminApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('listUsers calls GET /api/admin/users and returns the parsed users', async () => {
    const users = [
      { id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin', status: 'active', department_id: null },
    ]
    const fetchMock = mockFetchOnce(users)

    const result = await listUsers()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users'),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(users)
  })

  it('createDepartment posts the payload and returns the created department', async () => {
    const department = { id: 1, name: 'Engineering', users_count: 0 }
    const fetchMock = mockFetchOnce(department, 201)

    const result = await createDepartment({ name: 'Engineering' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/departments'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Engineering' }),
      }),
    )
    expect(result).toEqual(department)
  })

  it('activateUser patches the correct activate endpoint', async () => {
    const user = { id: 7, name: 'Grace', email: 'grace@example.com', role: 'employee', status: 'active', department_id: null }
    const fetchMock = mockFetchOnce(user)

    await activateUser(7)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/7/activate'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deleteDepartment calls DELETE on the correct department id', async () => {
    const fetchMock = mockFetchOnce(null, 204)

    await deleteDepartment(3)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/departments/3'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('createProject posts the payload including an optional client_id', async () => {
    const project = { id: 1, name: 'Website Redesign', client_id: 2 }
    const fetchMock = mockFetchOnce(project, 201)

    const result = await createProject({ name: 'Website Redesign', client_id: 2 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/projects'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Website Redesign', client_id: 2 }),
      }),
    )
    expect(result).toEqual(project)
  })

  it('updateProject patches the correct project id', async () => {
    const project = { id: 1, name: 'Renamed Project', client_id: null }
    const fetchMock = mockFetchOnce(project)

    await updateProject(1, { name: 'Renamed Project', client_id: null })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/projects/1'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deleteClient calls DELETE on the correct client id', async () => {
    const fetchMock = mockFetchOnce(null, 204)

    await deleteClient(5)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/clients/5'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
