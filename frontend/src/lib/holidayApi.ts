import type { CreateHolidayPayload, Holiday, UpdateHolidayPayload } from '../types/holiday'
import { apiFetch } from './apiClient'

export function listHolidays(): Promise<Holiday[]> {
  return apiFetch<Holiday[]>('/holidays')
}

export function createHoliday(payload: CreateHolidayPayload): Promise<Holiday> {
  return apiFetch<Holiday>('/admin/holidays', { method: 'POST', body: payload })
}

export function updateHoliday(id: number, payload: UpdateHolidayPayload): Promise<Holiday> {
  return apiFetch<Holiday>(`/admin/holidays/${id}`, { method: 'PATCH', body: payload })
}

export function deleteHoliday(id: number): Promise<null> {
  return apiFetch<null>(`/admin/holidays/${id}`, { method: 'DELETE' })
}
