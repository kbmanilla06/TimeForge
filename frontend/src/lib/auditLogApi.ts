import type { PaginatedAuditLogs } from '../types/auditLog'
import { apiFetch } from './apiClient'

export interface ListAuditLogsParams {
  action?: string
  actor_id?: number
  date_from?: string
  date_to?: string
  page?: number
}

export function listAuditLogs(params: ListAuditLogsParams = {}): Promise<PaginatedAuditLogs> {
  const query = new URLSearchParams()
  if (params.action) query.set('action', params.action)
  if (params.actor_id) query.set('actor_id', String(params.actor_id))
  if (params.date_from) query.set('date_from', params.date_from)
  if (params.date_to) query.set('date_to', params.date_to)
  if (params.page) query.set('page', String(params.page))
  const suffix = query.toString() ? `?${query.toString()}` : ''

  return apiFetch<PaginatedAuditLogs>(`/admin/audit-logs${suffix}`)
}
