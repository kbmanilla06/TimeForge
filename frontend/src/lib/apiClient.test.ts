import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetchBlob, apiFetchUpload, ApiError, setToken } from './apiClient'

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

describe('apiFetchUpload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('POSTs the FormData without a JSON content type and attaches the bearer token', async () => {
    setToken('test-token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, original_name: 'receipt.pdf' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const formData = new FormData()
    const result = await apiFetchUpload('/time-entries/1/attachments', formData)

    expect(result).toEqual({ id: 1, original_name: 'receipt.pdf' })
    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBe(formData)
    expect(options.headers.Authorization).toBe('Bearer test-token')
    // The browser must set the multipart boundary itself.
    expect(options.headers['Content-Type']).toBeUndefined()
  })

  it('throws an ApiError carrying the validation errors on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        message: 'The file field must not be greater than 10240 kilobytes.',
        errors: { file: ['The file field must not be greater than 10240 kilobytes.'] },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetchUpload('/time-entries/1/attachments', new FormData())).rejects.toThrow(
      'The file field must not be greater than 10240 kilobytes.',
    )
  })
})
