import type { LeaveRequest, RejectLeaveRequestPayload, SubmitLeaveRequestPayload } from '../types/leaveRequest'
import { apiFetch } from './apiClient'

export function listMyLeaveRequests(): Promise<LeaveRequest[]> {
  return apiFetch<LeaveRequest[]>('/leave-requests')
}

export function submitLeaveRequest(payload: SubmitLeaveRequestPayload): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>('/leave-requests', { method: 'POST', body: payload })
}

export function listTeamLeaveRequests(): Promise<LeaveRequest[]> {
  return apiFetch<LeaveRequest[]>('/leave-requests/team')
}

export function approveLeaveRequest(id: number): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/leave-requests/${id}/approve`, { method: 'PATCH' })
}

export function rejectLeaveRequest(id: number, payload: RejectLeaveRequestPayload = {}): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/leave-requests/${id}/reject`, { method: 'PATCH', body: payload })
}
