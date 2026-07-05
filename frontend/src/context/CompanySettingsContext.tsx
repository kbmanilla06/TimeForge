import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { getCompanyLogoBlob, getCompanySettings } from '../lib/companySettingsApi'
import { CompanySettingsContext } from './useCompanySettings'

const DEFAULT_COMPANY_NAME = 'TimeForge'

/**
 * Shared company branding (name + logo), mirroring AuthContext's
 * pictureUrl pattern (Sprint 31) so the sidebar and the Company Settings
 * page both read from one fetch instead of each fetching independently
 * — an upload/save on the settings page updates the sidebar immediately
 * via the same refresh() call.
 */
export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const currentLogoUrl = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const settings = await getCompanySettings()
      setCompanyName(settings.company_name || DEFAULT_COMPANY_NAME)

      if (currentLogoUrl.current) {
        URL.revokeObjectURL(currentLogoUrl.current)
        currentLogoUrl.current = null
      }

      if (settings.has_logo) {
        const blob = await getCompanyLogoBlob()
        if (blob) {
          const objectUrl = URL.createObjectURL(blob)
          currentLogoUrl.current = objectUrl
          setLogoUrl(objectUrl)
          return
        }
      }

      setLogoUrl(null)
    } catch {
      // Company settings are cosmetic display data — a failed fetch
      // (network blip, not-yet-authenticated) just keeps the default
      // "TimeForge" branding rather than surfacing an error anywhere.
      setCompanyName(DEFAULT_COMPANY_NAME)
      setLogoUrl(null)
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading || !user) return
    void refresh()
  }, [isAuthLoading, user, refresh])

  useEffect(() => {
    return () => {
      if (currentLogoUrl.current) URL.revokeObjectURL(currentLogoUrl.current)
    }
  }, [])

  return (
    <CompanySettingsContext.Provider value={{ companyName, logoUrl, refresh }}>
      {children}
    </CompanySettingsContext.Provider>
  )
}
