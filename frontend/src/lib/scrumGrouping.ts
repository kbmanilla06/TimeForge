import type { DailyScrum } from '../types/scrum'

export interface EmployeeScrumGroup {
  userId: number
  userName: string
  scrums: DailyScrum[]
}

/**
 * Groups already-fetched team scrum entries by employee. Each group's
 * entries keep the order they arrived in (the API returns them
 * newest-first), so chronological order is preserved within a group.
 */
export function groupScrumsByEmployee(scrums: DailyScrum[]): EmployeeScrumGroup[] {
  const groups = new Map<number, EmployeeScrumGroup>()

  for (const scrum of scrums) {
    const existing = groups.get(scrum.user_id)
    if (existing) {
      existing.scrums.push(scrum)
    } else {
      groups.set(scrum.user_id, {
        userId: scrum.user_id,
        userName: scrum.user?.name ?? `User #${scrum.user_id}`,
        scrums: [scrum],
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.userName.localeCompare(b.userName))
}
