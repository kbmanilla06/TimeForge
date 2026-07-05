export interface AuditLogActor {
  id: number
  name: string
  email: string
}

export interface AuditLog {
  id: number
  actor_id: number | null
  actor: AuditLogActor | null
  action: string
  subject_type: string | null
  subject_id: number | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface PaginatedAuditLogs {
  data: AuditLog[]
  current_page: number
  last_page: number
  total: number
}
