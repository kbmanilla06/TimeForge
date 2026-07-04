import type { ProductivityTrendPoint } from '../types/dashboard'
import { apiFetch, apiFetchBlob } from './apiClient'

function dateQuery(date?: string): string {
  return date ? `?date=${encodeURIComponent(date)}` : ''
}

export function exportTeamHoursPdf(date?: string): Promise<Blob> {
  return apiFetchBlob(`/team-hours-report/export/pdf${dateQuery(date)}`)
}

export function exportTeamHoursExcel(date?: string): Promise<Blob> {
  return apiFetchBlob(`/team-hours-report/export/excel${dateQuery(date)}`)
}

export function getTeamHoursTrend(date?: string): Promise<ProductivityTrendPoint[]> {
  return apiFetch<ProductivityTrendPoint[]>(`/team-hours-report/trend${dateQuery(date)}`)
}
