export interface PayrollExceptionRow {
  user_id: number
  name: string
  department: string | null
  missing_hourly_rate: boolean
  unapproved_submitted_count: number
  rejected_or_revision_count: number
  attendance_without_entries_days: number
  entries_without_submission_days: number
  overtime_over_threshold: boolean
  overtime_hours: number
  has_any_exception: boolean
}
