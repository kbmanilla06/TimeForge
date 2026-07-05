export interface CompanySettings {
  company_name: string
  contact_email: string | null
  default_timezone: string | null
  has_logo: boolean
  overtime_multiplier: number
  payroll_period_label: string
}

export interface UpdateCompanySettingsPayload {
  company_name?: string | null
  contact_email?: string | null
  default_timezone?: string | null
}
