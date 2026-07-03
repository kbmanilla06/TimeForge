import type { Department } from '../types/admin'
import { apiFetch } from './apiClient'

export interface RegistrationPayload {
  first_name: string
  middle_name?: string
  last_name: string
  employee_id?: string
  department_id: number | ''
  position?: string
  email: string
  password: string
  password_confirmation: string
  contact_number?: string
  terms_accepted: boolean
}

export interface RegistrationResponse {
  message: string
}

export function listPublicDepartments(): Promise<Department[]> {
  return apiFetch<Department[]>('/register/departments')
}

export function registerAccount(payload: RegistrationPayload): Promise<RegistrationResponse> {
  return apiFetch<RegistrationResponse>('/register', { method: 'POST', body: payload })
}
