export interface AppNotification {
  id: string
  type: string
  data: {
    timesheet_id?: number
    date?: string
    employee_name?: string
    comment?: string | null
    message: string
  }
  read_at: string | null
  created_at: string
}
