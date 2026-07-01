import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from './download'

describe('downloadBlob', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURLSpy = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates an object URL, clicks a synthetic anchor with the filename, and revokes the URL', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const createElementSpy = vi.spyOn(document, 'createElement')

    const blob = new Blob(['data'])
    downloadBlob(blob, 'payroll-report.pdf')

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
    expect(createElementSpy).toHaveBeenCalledWith('a')

    const anchor = createElementSpy.mock.results[0].value as HTMLAnchorElement
    expect(anchor.download).toBe('payroll-report.pdf')
    expect(anchor.href).toContain('blob:mock-url')
    expect(appendSpy).toHaveBeenCalledWith(anchor)
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
    appendSpy.mockRestore()
    createElementSpy.mockRestore()
  })
})
