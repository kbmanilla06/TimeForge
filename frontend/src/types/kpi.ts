export interface Kpi {
  id: number
  name: string
  target_value: number | null
  unit: string | null
  created_by: number
}

export interface KpiAssignment {
  id: number
  kpi_id: number
  user_id: number | null
  department_id: number | null
  progress_value: number
  kpi?: Kpi | null
  user?: { id: number; name: string } | null
  department?: { id: number; name: string } | null
}

export interface CreateKpiPayload {
  name: string
  target_value?: number | null
  unit?: string | null
}

export interface CreateKpiAssignmentPayload {
  kpi_id: number
  user_id?: number | null
  department_id?: number | null
}

export interface TeamMember {
  id: number
  name: string
  department_id: number | null
}
