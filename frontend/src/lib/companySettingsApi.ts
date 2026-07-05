import type { ApiMessageResponse } from '../types/auth'
import type { CompanySettings, UpdateCompanySettingsPayload } from '../types/companySettings'
import { apiFetch, apiFetchBlob, apiFetchUpload } from './apiClient'

export function getCompanySettings(): Promise<CompanySettings> {
  return apiFetch<CompanySettings>('/company-settings')
}

export function updateCompanySettings(payload: UpdateCompanySettingsPayload): Promise<CompanySettings> {
  return apiFetch<CompanySettings>('/admin/company-settings', { method: 'PATCH', body: payload })
}

export function uploadCompanyLogo(file: File): Promise<ApiMessageResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetchUpload<ApiMessageResponse>('/admin/company-settings/logo', formData)
}

/** Resolves to null when no company logo has been set (404). */
export async function getCompanyLogoBlob(): Promise<Blob | null> {
  try {
    return await apiFetchBlob('/company-logo')
  } catch {
    return null
  }
}
