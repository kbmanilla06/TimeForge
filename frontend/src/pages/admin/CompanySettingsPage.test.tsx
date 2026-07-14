import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as companySettingsApi from '../../lib/companySettingsApi'
import type { CompanySettings } from '../../types/companySettings'
import { CompanySettingsPage } from './CompanySettingsPage'

vi.mock('../../lib/companySettingsApi')

const mockRefresh = vi.fn()
vi.mock('../../context/useCompanySettings', () => ({
  useCompanySettings: () => ({ companyName: 'All in Time', logoUrl: null, refresh: mockRefresh }),
}))

const BASE_SETTINGS: CompanySettings = {
  company_name: 'All in Time',
  contact_email: null,
  default_timezone: null,
  has_logo: false,
  overtime_multiplier: 1.25,
  payroll_period_label: 'Semi-monthly: 1st–15th, 16th–end of month',
}

function mockGet(settings: CompanySettings) {
  vi.mocked(companySettingsApi.getCompanySettings).mockResolvedValue(settings)
}

describe('CompanySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loaded settings including read-only payroll info', async () => {
    mockGet({
      ...BASE_SETTINGS,
      company_name: 'Acme Corp',
      contact_email: 'hello@acme.test',
      default_timezone: 'Asia/Manila',
    })

    render(<CompanySettingsPage />)

    expect(await screen.findByDisplayValue('Acme Corp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('hello@acme.test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Asia/Manila')).toBeInTheDocument()
    expect(screen.getByText('1.25×')).toBeInTheDocument()
    expect(screen.getByText('Semi-monthly: 1st–15th, 16th–end of month')).toBeInTheDocument()
  })

  it('shows "No logo" when none is configured', async () => {
    mockGet(BASE_SETTINGS)
    render(<CompanySettingsPage />)

    expect(await screen.findByText('No logo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload Logo' })).toBeInTheDocument()
  })

  it('shows "Replace Logo" once a logo already exists', async () => {
    mockGet({ ...BASE_SETTINGS, has_logo: true })
    render(<CompanySettingsPage />)

    expect(await screen.findByRole('button', { name: 'Replace Logo' })).toBeInTheDocument()
  })

  it('saves updated settings and refreshes shared branding', async () => {
    const user = userEvent.setup()
    mockGet(BASE_SETTINGS)
    vi.mocked(companySettingsApi.updateCompanySettings).mockResolvedValue({
      ...BASE_SETTINGS,
      company_name: 'Acme Corp',
    })

    render(<CompanySettingsPage />)
    await screen.findByDisplayValue('All in Time')

    const nameInput = screen.getByDisplayValue('All in Time')
    await user.clear(nameInput)
    await user.type(nameInput, 'Acme Corp')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(companySettingsApi.updateCompanySettings).toHaveBeenCalledWith({
        company_name: 'Acme Corp',
        contact_email: null,
        default_timezone: null,
      }),
    )
    expect(await screen.findByText('Company settings updated.')).toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows the server validation error when saving an invalid timezone', async () => {
    const user = userEvent.setup()
    mockGet(BASE_SETTINGS)
    const { ApiError } = await import('../../lib/apiClient')
    vi.mocked(companySettingsApi.updateCompanySettings).mockRejectedValue(
      new ApiError(422, 'The selected default timezone is invalid.', {
        default_timezone: ['The selected default timezone is invalid.'],
      }),
    )

    render(<CompanySettingsPage />)
    await screen.findByDisplayValue('All in Time')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('The selected default timezone is invalid.')).toBeInTheDocument()
  })

  it('uploads a logo and reloads settings plus shared branding', async () => {
    const user = userEvent.setup()
    mockGet(BASE_SETTINGS)
    vi.mocked(companySettingsApi.uploadCompanyLogo).mockResolvedValue({ message: 'Company logo updated.' })

    render(<CompanySettingsPage />)
    await screen.findByText('No logo')

    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const input = document.getElementById('company-logo-input') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => expect(companySettingsApi.uploadCompanyLogo).toHaveBeenCalledWith(file))
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('rejects an oversized logo file client-side without calling the API', async () => {
    const user = userEvent.setup()
    mockGet(BASE_SETTINGS)

    render(<CompanySettingsPage />)
    await screen.findByText('No logo')

    const bigFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    const input = document.getElementById('company-logo-input') as HTMLInputElement
    await user.upload(input, bigFile)

    expect(await screen.findByText('Image must be 2MB or smaller.')).toBeInTheDocument()
    expect(companySettingsApi.uploadCompanyLogo).not.toHaveBeenCalled()
  })

  it('rejects a file whose real content type is not PNG/JPG client-side without calling the API', async () => {
    const user = userEvent.setup()
    mockGet(BASE_SETTINGS)

    render(<CompanySettingsPage />)
    await screen.findByText('No logo')

    // Named .png (so it passes the input's extension-based accept filter)
    // but with a mismatched real MIME type, to reach validateLogoFile's
    // own file.type check rather than being filtered out by the browser
    // before onChange ever fires.
    const badFile = new File(['not an image'], 'logo.png', { type: 'image/gif' })
    const input = document.getElementById('company-logo-input') as HTMLInputElement
    await user.upload(input, badFile)

    expect(await screen.findByText('Please choose a PNG or JPG image.')).toBeInTheDocument()
    expect(companySettingsApi.uploadCompanyLogo).not.toHaveBeenCalled()
  })
})
