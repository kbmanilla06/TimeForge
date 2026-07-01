import type { TimeEntry } from './timeEntry'

export type TimesheetStatus = 'submitted' | 'approved' | 'rejected' | 'revision_requested'

export type TimesheetCommentAction = 'approved' | 'rejected' | 'revision_requested' | 'reopened'

export interface TimesheetComment {
  id: number
  timesheet_id: number
  author_id: number
  action: TimesheetCommentAction
  comment: string | null
  author?: { id: number; name: string } | null
  created_at: string
}

export interface Timesheet {
  id: number
  user_id: number
  date: string
  status: TimesheetStatus
  submitted_at: string | null
  reviewed_by: number | null
  reviewed_at: string | null
  time_entries?: TimeEntry[]
  comments?: TimesheetComment[]
  user?: { id: number; name: string } | null
}

export interface SubmitTimesheetPayload {
  date: string
}

export interface ReviewTimesheetPayload {
  comment?: string | null
}
