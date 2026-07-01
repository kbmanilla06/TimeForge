import type { AddScrumCommentPayload, DailyScrum, SubmitScrumPayload } from '../types/scrum'
import { apiFetch } from './apiClient'

export function listMyScrums(): Promise<DailyScrum[]> {
  return apiFetch<DailyScrum[]>('/daily-scrums')
}

export function getScrum(id: number): Promise<DailyScrum> {
  return apiFetch<DailyScrum>(`/daily-scrums/${id}`)
}

export function submitScrum(payload: SubmitScrumPayload): Promise<DailyScrum> {
  return apiFetch<DailyScrum>('/daily-scrums', { method: 'POST', body: payload })
}

export function listTeamScrums(): Promise<DailyScrum[]> {
  return apiFetch<DailyScrum[]>('/daily-scrums/team')
}

export function addScrumComment(id: number, payload: AddScrumCommentPayload): Promise<DailyScrum> {
  return apiFetch<DailyScrum>(`/daily-scrums/${id}/comments`, { method: 'POST', body: payload })
}
