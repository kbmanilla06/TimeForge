import type { ReviewTimesheetPayload, SubmitTimesheetPayload, Timesheet } from '../types/timesheet'
import { apiFetch } from './apiClient'

export function listMyTimesheets(): Promise<Timesheet[]> {
  return apiFetch<Timesheet[]>('/timesheets')
}

export function getTimesheet(id: number): Promise<Timesheet> {
  return apiFetch<Timesheet>(`/timesheets/${id}`)
}

export function submitTimesheet(payload: SubmitTimesheetPayload): Promise<Timesheet> {
  return apiFetch<Timesheet>('/timesheets', { method: 'POST', body: payload })
}

export function listTeamTimesheets(): Promise<Timesheet[]> {
  return apiFetch<Timesheet[]>('/timesheets/team')
}

export function approveTimesheet(id: number, payload: ReviewTimesheetPayload = {}): Promise<Timesheet> {
  return apiFetch<Timesheet>(`/timesheets/${id}/approve`, { method: 'PATCH', body: payload })
}

export function rejectTimesheet(id: number, payload: ReviewTimesheetPayload): Promise<Timesheet> {
  return apiFetch<Timesheet>(`/timesheets/${id}/reject`, { method: 'PATCH', body: payload })
}

export function requestRevision(id: number, payload: ReviewTimesheetPayload): Promise<Timesheet> {
  return apiFetch<Timesheet>(`/timesheets/${id}/request-revision`, { method: 'PATCH', body: payload })
}

export function reopenTimesheet(id: number, payload: ReviewTimesheetPayload = {}): Promise<Timesheet> {
  return apiFetch<Timesheet>(`/timesheets/${id}/reopen`, { method: 'PATCH', body: payload })
}
