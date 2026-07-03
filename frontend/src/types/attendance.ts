export interface AttendanceSession {
  id: number
  date: string
  time_in: string
  break_started_at: string | null
  break_resumed_at: string | null
  time_out: string | null
  is_on_break: boolean
  has_used_break: boolean
  is_timed_out: boolean
  working_minutes: number
  break_minutes: number
  total_minutes: number
}

export interface AttendanceTodayResponse {
  session: AttendanceSession | null
}
