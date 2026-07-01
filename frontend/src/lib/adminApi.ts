import type {
  AdminUser,
  CreateDepartmentPayload,
  CreateUserPayload,
  Department,
  UpdateDepartmentPayload,
  UpdateUserPayload,
} from '../types/admin'
import { apiFetch } from './apiClient'

export function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users')
}

export function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/users', { method: 'POST', body: payload })
}

export function updateUser(id: number, payload: UpdateUserPayload): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: payload })
}

export function activateUser(id: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}/activate`, { method: 'PATCH' })
}

export function deactivateUser(id: number): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}/deactivate`, { method: 'PATCH' })
}

export function listDepartments(): Promise<Department[]> {
  return apiFetch<Department[]>('/admin/departments')
}

export function createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
  return apiFetch<Department>('/admin/departments', { method: 'POST', body: payload })
}

export function updateDepartment(id: number, payload: UpdateDepartmentPayload): Promise<Department> {
  return apiFetch<Department>(`/admin/departments/${id}`, { method: 'PATCH', body: payload })
}

export function deleteDepartment(id: number): Promise<null> {
  return apiFetch<null>(`/admin/departments/${id}`, { method: 'DELETE' })
}
