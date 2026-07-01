export interface PayrollSummaryRow {
  user_id: number
  name: string
  department: string | null
  hourly_rate: number | null
  approved_minutes: number
  regular_minutes: number
  overtime_minutes: number
  pending_minutes: number
  rejected_minutes: number
  attendance_days: number
  estimated_payroll: number | null
  period_start: string
  period_end: string
}
