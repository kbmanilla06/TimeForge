import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
} from '../../lib/companySettingsApi'
import { ApiError } from '../../lib/apiClient'
import { useCompanySettings } from '../../context/useCompanySettings'
import type { CompanySettings } from '../../types/companySettings'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/Card'
import { LoadingState } from '../../components/ui/states'

const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg']
const MAX_LOGO_BYTES = 2 * 1024 * 1024 // matches UploadCompanyLogoRequest's server-side 2MB limit

function validateLogoFile(file: File): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return 'Please choose a PNG or JPG image.'
  }
  if (file.size > MAX_LOGO_BYTES) {
    return 'Image must be 2MB or smaller.'
  }
  return null
}

export function CompanySettingsPage() {
  const { logoUrl, refresh: refreshCompanySettings } = useCompanySettings()
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [defaultTimezone, setDefaultTimezone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await getCompanySettings()
      setSettings(data)
      setCompanyName(data.company_name)
      setContactEmail(data.contact_email ?? '')
      setDefaultTimezone(data.default_timezone ?? '')
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Unable to load company settings.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaveError(null)
    setSaveSuccess(null)
    setIsSaving(true)
    try {
      const updated = await updateCompanySettings({
        company_name: companyName || null,
        contact_email: contactEmail || null,
        default_timezone: defaultTimezone || null,
      })
      setSettings(updated)
      setSaveSuccess('Company settings updated.')
      await refreshCompanySettings()
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? (err.errors?.default_timezone?.[0] ?? err.message)
          : 'Unable to update company settings.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLogoError(null)

    const validationError = validateLogoFile(file)
    if (validationError) {
      setLogoError(validationError)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploadingLogo(true)
    try {
      await uploadCompanyLogo(file)
      await Promise.all([loadSettings(), refreshCompanySettings()])
    } catch (err) {
      setLogoError(
        err instanceof ApiError ? (err.errors?.file?.[0] ?? err.message) : 'Unable to upload logo.',
      )
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Company Settings"
        subtitle="Configure organization-level defaults used across TimeForge."
      />

      {loadError && (
        <Alert tone="error" className="mb-4">
          {loadError}
        </Alert>
      )}

      <SectionCard title="Company Logo">
        {logoError && (
          <Alert tone="error" className="mb-4">
            {logoError}
          </Alert>
        )}
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Company logo"
              className="size-16 rounded-lg border border-line object-contain"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted">
              No logo
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleLogoChange}
              className="hidden"
              id="company-logo-input"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isUploadingLogo}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingLogo ? 'Uploading…' : settings?.has_logo ? 'Replace Logo' : 'Upload Logo'}
            </Button>
            <p className="mt-2 text-xs text-muted">PNG or JPG, up to 2MB. Optional.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Organization Defaults">
        {saveError && (
          <Alert tone="error" className="mb-4">
            {saveError}
          </Alert>
        )}
        {saveSuccess && (
          <Alert tone="success" className="mb-4">
            {saveSuccess}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Company Name" htmlFor="company-name">
            <TextInput
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="TimeForge"
            />
          </Field>
          <Field label="Contact Email" htmlFor="company-contact-email">
            <TextInput
              id="company-contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@yourcompany.com"
            />
          </Field>
          <Field
            label="Default Timezone"
            htmlFor="company-timezone"
            hint="An IANA timezone identifier, e.g. Asia/Manila, America/New_York, UTC."
          >
            <TextInput
              id="company-timezone"
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              placeholder="UTC"
            />
          </Field>
          <Button type="submit" disabled={isSaving}>
            Save Changes
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Payroll Defaults (read-only)">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink">Overtime Multiplier</dt>
            <dd className="text-muted">{settings?.overtime_multiplier}×</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Payroll Period</dt>
            <dd className="text-muted">{settings?.payroll_period_label}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          These are configured via the server environment, not editable here.
        </p>
      </SectionCard>
    </main>
  )
}
