import type { Client, Project } from '../types/admin'
import type {
  StartTimerPayload,
  TimeEntry,
  TimeEntryAttachment,
  TimeEntryFormPayload,
  TimeEntrySummary,
} from '../types/timeEntry'
import { apiFetch, apiFetchBlob, apiFetchUpload } from './apiClient'

export function listTimeEntries(): Promise<TimeEntry[]> {
  return apiFetch<TimeEntry[]>('/time-entries')
}

export function getTimeEntry(id: number): Promise<TimeEntry> {
  return apiFetch<TimeEntry>(`/time-entries/${id}`)
}

export function createTimeEntry(payload: TimeEntryFormPayload): Promise<TimeEntry> {
  return apiFetch<TimeEntry>('/time-entries', { method: 'POST', body: payload })
}

export function updateTimeEntry(id: number, payload: TimeEntryFormPayload): Promise<TimeEntry> {
  return apiFetch<TimeEntry>(`/time-entries/${id}`, { method: 'PATCH', body: payload })
}

export function deleteTimeEntry(id: number): Promise<null> {
  return apiFetch<null>(`/time-entries/${id}`, { method: 'DELETE' })
}

export function uploadAttachment(entryId: number, file: File): Promise<TimeEntryAttachment> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetchUpload<TimeEntryAttachment>(`/time-entries/${entryId}/attachments`, formData)
}

export function downloadAttachment(entryId: number, attachmentId: number): Promise<Blob> {
  return apiFetchBlob(`/time-entries/${entryId}/attachments/${attachmentId}/download`)
}

export function deleteAttachment(entryId: number, attachmentId: number): Promise<null> {
  return apiFetch<null>(`/time-entries/${entryId}/attachments/${attachmentId}`, { method: 'DELETE' })
}

export function startTimer(payload: StartTimerPayload): Promise<TimeEntry> {
  return apiFetch<TimeEntry>('/time-entries/start', { method: 'POST', body: payload })
}

export function stopTimer(id: number): Promise<TimeEntry> {
  return apiFetch<TimeEntry>(`/time-entries/${id}/stop`, { method: 'PATCH' })
}

export function getSummary(): Promise<TimeEntrySummary> {
  return apiFetch<TimeEntrySummary>('/time-entries/summary')
}

export function listProjectsForSelf(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects')
}

export function listClientsForSelf(): Promise<Client[]> {
  return apiFetch<Client[]>('/clients')
}
