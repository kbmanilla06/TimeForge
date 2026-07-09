import type { ApiMessageResponse, User } from '../types/auth'
import { apiFetch, apiFetchBlob, apiFetchUpload } from './apiClient'

export interface UpdateProfilePayload {
  contact_number?: string | null
  position?: string | null
  timezone?: string | null
}

export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return apiFetch<User>('/profile', { method: 'PATCH', body: payload })
}

export function uploadProfilePicture(file: File): Promise<ApiMessageResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetchUpload<ApiMessageResponse>('/profile/picture', formData)
}

/** Resolves to null when the user has no profile picture set (404). */
export async function getProfilePictureBlob(): Promise<Blob | null> {
  try {
    return await apiFetchBlob('/profile/picture')
  } catch {
    return null
  }
}

export interface ChangePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export function changePassword(payload: ChangePasswordPayload): Promise<ApiMessageResponse> {
  return apiFetch<ApiMessageResponse>('/profile/password', { method: 'PATCH', body: payload })
}
