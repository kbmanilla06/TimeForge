export interface EmployeeProductivityRow {
  user_id: number
  name: string
  department: string | null
  approved_minutes: number
}

export interface DepartmentPerformanceRow {
  department_id: number
  department_name: string | null
  approved_minutes: number
  average_kpi_completion_rate: number | null
}

export interface KpiCompletionRateRow {
  kpi_assignment_id: number
  department_id: number | null
  kpi_name: string
  target: number
  progress: number
  completion_rate: number
  assignee: string
}

export interface AttendanceTrendPoint {
  date: string
  employee_count: number
}

export interface ProjectAllocationRow {
  project_id: number
  project_name: string
  approved_minutes: number
}

export interface PayrollSummaryMetric {
  total_estimated_payroll: number
  total_regular_minutes: number
  total_overtime_minutes: number
  employees_with_rate_count: number
  employees_without_rate_count: number
}

export interface ProductivityTrendPoint {
  period_start: string
  period_end: string
  approved_minutes: number
}

export interface DashboardData {
  scope: 'organization' | 'department'
  department_name: string | null
  period_start: string
  period_end: string
  total_hours_minutes: number
  employee_productivity: EmployeeProductivityRow[]
  department_performance: DepartmentPerformanceRow[]
  pending_approvals: number
  kpi_completion_rates: KpiCompletionRateRow[]
  attendance_trends: AttendanceTrendPoint[]
  billable_minutes: number
  non_billable_minutes: number
  project_allocation: ProjectAllocationRow[]
  payroll_summary?: PayrollSummaryMetric
}
