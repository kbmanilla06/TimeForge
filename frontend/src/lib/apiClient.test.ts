import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetchBlob, ApiError, setToken } from './apiClient'

describe('apiFetchBlob', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('resolves to a Blob and attaches the bearer token', async () => {
    setToken('test-token')
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiFetchBlob('/payroll/export/pdf')

    expect(result).toBe(blob)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/payroll/export/pdf'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )
  })

  it('throws an ApiError with the parsed message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'You are not authorized to view payroll data.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetchBlob('/payroll/export/pdf')).rejects.toThrow(ApiError)
    await expect(apiFetchBlob('/payroll/export/pdf')).rejects.toThrow(
      'You are not authorized to view payroll data.',
    )
  })
})
