import type { Timesheet, TimesheetStatus } from '../types/timesheet'

export interface EmployeeTimesheetGroup {
  userId: number
  userName: string
  totalMinutes: number
  timesheets: Timesheet[]
}

/**
 * Groups already-fetched team timesheets by employee. Each group's
 * timesheets keep the order they arrived in (the API returns them
 * newest-first), so chronological order is preserved within a group.
 */
export function groupTimesheetsByEmployee(timesheets: Timesheet[]): EmployeeTimesheetGroup[] {
  const groups = new Map<number, EmployeeTimesheetGroup>()

  for (const timesheet of timesheets) {
    const minutes = (timesheet.time_entries ?? []).reduce(
      (sum, entry) => sum + (entry.duration_minutes ?? 0),
      0
    )

    const existing = groups.get(timesheet.user_id)
    if (existing) {
      existing.totalMinutes += minutes
      existing.timesheets.push(timesheet)
    } else {
      groups.set(timesheet.user_id, {
        userId: timesheet.user_id,
        userName: timesheet.user?.name ?? `User #${timesheet.user_id}`,
        totalMinutes: minutes,
        timesheets: [timesheet],
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.userName.localeCompare(b.userName))
}

export interface TimesheetFilters {
  status: TimesheetStatus | 'all'
  startDate: string
  endDate: string
}

export const defaultTimesheetFilters: TimesheetFilters = { status: 'all', startDate: '', endDate: '' }

export function filterTimesheets(timesheets: Timesheet[], filters: TimesheetFilters): Timesheet[] {
  return timesheets.filter((timesheet) => {
    if (filters.status !== 'all' && timesheet.status !== filters.status) return false
    if (filters.startDate && timesheet.date < filters.startDate) return false
    if (filters.endDate && timesheet.date > filters.endDate) return false
    return true
  })
}
