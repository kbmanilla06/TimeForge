import type { AttendanceSession, AttendanceTodayResponse } from '../types/attendance'
import { apiFetch } from './apiClient'

export function getTodaysAttendance(): Promise<AttendanceTodayResponse> {
  return apiFetch<AttendanceTodayResponse>('/attendance/today')
}

export function timeIn(): Promise<AttendanceSession> {
  return apiFetch<AttendanceSession>('/attendance/time-in', { method: 'POST' })
}

export function pauseBreak(): Promise<AttendanceSession> {
  return apiFetch<AttendanceSession>('/attendance/pause', { method: 'PATCH' })
}

export function resumeBreak(): Promise<AttendanceSession> {
  return apiFetch<AttendanceSession>('/attendance/resume', { method: 'PATCH' })
}

export function timeOut(): Promise<AttendanceSession> {
  return apiFetch<AttendanceSession>('/attendance/time-out', { method: 'PATCH' })
}
