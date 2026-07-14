import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as companySettingsApi from '../lib/companySettingsApi'
import type { CompanySettings } from '../types/companySettings'
import { CompanySettingsProvider } from './CompanySettingsContext'
import { useCompanySettings } from './useCompanySettings'

vi.mock('../lib/companySettingsApi')

const mockUseAuth = vi.fn()
vi.mock('./useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const BASE_SETTINGS: CompanySettings = {
  company_name: 'Acme Corp',
  contact_email: null,
  default_timezone: null,
  has_logo: false,
  overtime_multiplier: 1.25,
  payroll_period_label: 'Semi-monthly: 1st–15th, 16th–end of month',
}

function Probe() {
  const { companyName, logoUrl } = useCompanySettings()
  return (
    <div>
      <span data-testid="name">{companyName}</span>
      <span data-testid="logo">{logoUrl ?? 'none'}</span>
    </div>
  )
}

function renderProbe() {
  return render(
    <CompanySettingsProvider>
      <Probe />
    </CompanySettingsProvider>,
  )
}

describe('CompanySettingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:mock-logo-url')
    URL.revokeObjectURL = vi.fn()
  })

  it('does not fetch while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true })

    renderProbe()

    expect(companySettingsApi.getCompanySettings).not.toHaveBeenCalled()
    expect(screen.getByTestId('name')).toHaveTextContent('All in Time')
  })

  it('does not fetch when there is no authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })

    renderProbe()

    expect(companySettingsApi.getCompanySettings).not.toHaveBeenCalled()
  })

  it('fetches and exposes the company name once authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1 }, isLoading: false })
    vi.mocked(companySettingsApi.getCompanySettings).mockResolvedValue(BASE_SETTINGS)

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Acme Corp'))
    expect(screen.getByTestId('logo')).toHaveTextContent('none')
  })

  it('falls back to the empty company_name default when the name is blank', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1 }, isLoading: false })
    vi.mocked(companySettingsApi.getCompanySettings).mockResolvedValue({ ...BASE_SETTINGS, company_name: '' })

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('All in Time'))
  })

  it('fetches the logo blob and exposes it as an object URL when has_logo is true', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1 }, isLoading: false })
    vi.mocked(companySettingsApi.getCompanySettings).mockResolvedValue({ ...BASE_SETTINGS, has_logo: true })
    vi.mocked(companySettingsApi.getCompanyLogoBlob).mockResolvedValue(new Blob(['logo']))

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('logo')).toHaveTextContent('blob:mock-logo-url'))
  })

  it('falls back to the default branding when the settings fetch fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1 }, isLoading: false })
    vi.mocked(companySettingsApi.getCompanySettings).mockRejectedValue(new Error('network error'))

    renderProbe()

    await waitFor(() => expect(companySettingsApi.getCompanySettings).toHaveBeenCalled())
    expect(screen.getByTestId('name')).toHaveTextContent('All in Time')
    expect(screen.getByTestId('logo')).toHaveTextContent('none')
  })
})
