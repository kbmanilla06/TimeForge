export type AiOutputType =
  | 'daily_work_summary'
  | 'weekly_productivity_report'
  | 'productivity_trend_analysis'
  | 'recurring_blockers'
  | 'kpi_performance_analysis'
  | 'supervisor_recommendations'
  | 'payroll_validation'

export interface AiOutput {
  id: number
  type: AiOutputType
  user_id: number | null
  department_id: number | null
  period_start: string
  period_end: string
  content: string
  provider: string
  prompt_version: string
  generated_by: number
  generated_by_name: string
  generated_at: string
}

/**
 * Shared shape for both listing and generating: type + reference date +
 * exactly one subject (user for summaries/reports, department for the
 * blocker report). The backend resolves the stored period from the date.
 */
export interface AiOutputQuery {
  type: AiOutputType
  date: string
  user_id?: number
  department_id?: number
}

export interface AiOutputListResponse {
  outputs: AiOutput[]
}

export type AssistantCategory =
  | 'team_progress'
  | 'department_productivity'
  | 'attendance_trend'
  | 'scrum_summary'
  | 'behind_schedule'
  | 'kpi_furthest_below_target'
  | 'unsupported'

export interface AssistantChartPoint {
  label: string
  value: number
}

export interface AssistantChart {
  type: 'bar' | 'line'
  series_label: string
  points: AssistantChartPoint[]
}

export interface AssistantTable {
  columns: string[]
  rows: Array<Array<string | number>>
}

export interface AssistantAnswer {
  question: string
  category: AssistantCategory
  executive_summary: string
  detail: string
  chart: AssistantChart | null
  table: AssistantTable | null
  recommendations: string[]
  supported_examples: string[] | null
  generated_at: string
}
