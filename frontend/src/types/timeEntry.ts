import type { Client, Department, Project } from './admin'
import type { TimesheetStatus } from './timesheet'

export interface TimeEntry {
  id: number
  user_id: number
  project_id: number | null
  client_id: number | null
  department_id: number | null
  timesheet_id: number | null
  kpi_assignment_id: number | null
  date: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  task: string
  task_status: string | null
  work_category: string
  description: string
  reference_links: string[] | null
  deliverables: string[] | null
  kpi_progress_value: number | null
  project?: Project | null
  client?: Client | null
  department?: Department | null
  timesheet?: { id: number; status: TimesheetStatus } | null
  attachments?: TimeEntryAttachment[]
}

export interface TimeEntryAttachment {
  id: number
  time_entry_id: number
  original_name: string
  mime_type: string
  size_bytes: number
  uploaded_by: number
  created_at: string
}

export function isTimeEntryLocked(entry: TimeEntry): boolean {
  return entry.timesheet != null && entry.timesheet.status !== 'revision_requested'
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
  task_status?: string | null
  work_category: string
  description: string
  reference_links?: string[] | null
  deliverables?: string[] | null
  kpi_assignment_id?: number | null
  kpi_progress_value?: number | null
}

export interface StartTimerPayload {
  project_id?: number | null
  client_id?: number | null
  task: string
  task_status?: string | null
  work_category: string
  description: string
  reference_links?: string[] | null
  deliverables?: string[] | null
  kpi_assignment_id?: number | null
  kpi_progress_value?: number | null
}
