import type { DashboardData } from '../types/dashboard'
import { apiFetch } from './apiClient'

export function getDashboard(date?: string): Promise<DashboardData> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiFetch<DashboardData>(`/dashboard${query}`)
}
