import type { KpiAssignment } from '../types/kpi'

export type KpiCategory = 'completed' | 'current' | 'pending'

/**
 * Completed: has a target and progress has reached it.
 * Current: any progress that hasn't reached a target (or has no target at all).
 * Pending: no progress yet.
 */
export function categorizeAssignment(assignment: KpiAssignment): KpiCategory {
  const target = assignment.kpi?.target_value
  const progress = assignment.progress_value

  if (target != null && progress >= target) return 'completed'
  if (progress > 0) return 'current'
  return 'pending'
}

export interface KpiCategoryGroups {
  completed: KpiAssignment[]
  current: KpiAssignment[]
  pending: KpiAssignment[]
}

export function groupByCategory(assignments: KpiAssignment[]): KpiCategoryGroups {
  const groups: KpiCategoryGroups = { completed: [], current: [], pending: [] }
  for (const assignment of assignments) {
    groups[categorizeAssignment(assignment)].push(assignment)
  }
  return groups
}

/** Percentage of target reached, capped at 100. Null when there is no target to measure against. */
export function completionRate(assignment: KpiAssignment): number | null {
  const target = assignment.kpi?.target_value
  if (target == null || target <= 0) return null
  return Math.min(Math.round((assignment.progress_value / target) * 100), 100)
}

export function assignmentLabel(assignment: KpiAssignment): string {
  const kpiName = assignment.kpi?.name ?? '—'
  const who = assignment.user?.name ?? (assignment.department ? `${assignment.department.name} (dept.)` : null)
  return who ? `${kpiName} — ${who}` : kpiName
}
