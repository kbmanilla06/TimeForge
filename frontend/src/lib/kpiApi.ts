import type { CreateKpiAssignmentPayload, CreateKpiPayload, Kpi, KpiAssignment, TeamMember } from '../types/kpi'
import { apiFetch } from './apiClient'

export function listKpis(): Promise<Kpi[]> {
  return apiFetch<Kpi[]>('/kpis')
}

export function createKpi(payload: CreateKpiPayload): Promise<Kpi> {
  return apiFetch<Kpi>('/admin/kpis', { method: 'POST', body: payload })
}

export function listMyAssignments(): Promise<KpiAssignment[]> {
  return apiFetch<KpiAssignment[]>('/kpi-assignments/mine')
}

export function listTeamAssignments(): Promise<KpiAssignment[]> {
  return apiFetch<KpiAssignment[]>('/kpi-assignments/team')
}

export function createAssignment(payload: CreateKpiAssignmentPayload): Promise<KpiAssignment> {
  return apiFetch<KpiAssignment>('/kpi-assignments', { method: 'POST', body: payload })
}

export function deleteAssignment(id: number): Promise<void> {
  return apiFetch<void>(`/kpi-assignments/${id}`, { method: 'DELETE' })
}

export function listTeamMembers(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>('/team-members')
}
