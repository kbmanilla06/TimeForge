export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export type LeaveType = 'vacation' | 'sick' | 'other'

export interface LeaveRequest {
  id: number
  user_id: number
  start_date: string
  end_date: string
  leave_type: LeaveType
  reason: string | null
  status: LeaveStatus
  reviewed_by: number | null
  reviewed_at: string | null
  rejection_reason: string | null
  reviewer?: { id: number; name: string } | null
  user?: { id: number; name: string } | null
}

export interface SubmitLeaveRequestPayload {
  start_date: string
  end_date: string
  leave_type: LeaveType
  reason?: string | null
}

export interface RejectLeaveRequestPayload {
  rejection_reason?: string | null
}
