import { createContext, useContext } from 'react'

export interface CompanySettingsContextValue {
  companyName: string
  logoUrl: string | null
  refresh: () => Promise<void>
}

export const CompanySettingsContext = createContext<CompanySettingsContextValue | undefined>(undefined)

export function useCompanySettings(): CompanySettingsContextValue {
  const context = useContext(CompanySettingsContext)

  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider')
  }

  return context
}
