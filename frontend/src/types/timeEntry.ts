import type { Client, Department, Project } from './admin'

export interface TimeEntry {
  id: number
  user_id: number
  project_id: number | null
  client_id: number | null
  department_id: number | null
  date: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  task: string
  work_category: string
  description: string
  reference_links: string[] | null
  deliverables: string[] | null
  project?: Project | null
  client?: Client | null
  department?: Department | null
}

export interface TimeEntrySummary {
  today_minutes: number
  week_minutes: number
  month_minutes: number
  payroll_period_minutes: number
  payroll_period_start: string
  payroll_period_end: string
}

export interface TimeEntryFormPayload {
  date: string
  start_time: string
  end_time: string
  project_id?: number | null
  client_id?: number | null
  task: string
  work_category: string
  description: string
  reference_links?: string[] | null
  deliverables?: string[] | null
}

export interface StartTimerPayload {
  project_id?: number | null
  client_id?: number | null
  task: string
  work_category: string
  description: string
  reference_links?: string[] | null
  deliverables?: string[] | null
}
