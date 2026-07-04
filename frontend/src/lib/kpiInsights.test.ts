import { describe, expect, it } from 'vitest'
import type { KpiAssignment } from '../types/kpi'
import { assignmentLabel, categorizeAssignment, completionRate, groupByCategory } from './kpiInsights'

function makeAssignment(overrides: Partial<KpiAssignment>): KpiAssignment {
  return {
    id: 1,
    kpi_id: 1,
    user_id: null,
    department_id: null,
    progress_value: 0,
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('categorizeAssignment', () => {
  it('is completed when progress has reached a set target', () => {
    const assignment = makeAssignment({ progress_value: 10, kpi: { id: 1, name: 'Bugs', target_value: 10, unit: null, created_by: 1 } })
    expect(categorizeAssignment(assignment)).toBe('completed')
  })

  it('is current when progress exists but has not reached the target', () => {
    const assignment = makeAssignment({ progress_value: 3, kpi: { id: 1, name: 'Bugs', target_value: 10, unit: null, created_by: 1 } })
    expect(categorizeAssignment(assignment)).toBe('current')
  })

  it('is current when there is no target but progress exists', () => {
    const assignment = makeAssignment({ progress_value: 4, kpi: { id: 1, name: 'Campaigns', target_value: null, unit: null, created_by: 1 } })
    expect(categorizeAssignment(assignment)).toBe('current')
  })

  it('is pending when progress is zero', () => {
    const assignment = makeAssignment({ progress_value: 0, kpi: { id: 1, name: 'Bugs', target_value: 10, unit: null, created_by: 1 } })
    expect(categorizeAssignment(assignment)).toBe('pending')
  })
})

describe('groupByCategory', () => {
  it('buckets assignments into their category', () => {
    const completed = makeAssignment({ id: 1, progress_value: 10, kpi: { id: 1, name: 'A', target_value: 10, unit: null, created_by: 1 } })
    const current = makeAssignment({ id: 2, progress_value: 3, kpi: { id: 2, name: 'B', target_value: 10, unit: null, created_by: 1 } })
    const pending = makeAssignment({ id: 3, progress_value: 0, kpi: { id: 3, name: 'C', target_value: 10, unit: null, created_by: 1 } })

    const groups = groupByCategory([completed, current, pending])

    expect(groups.completed).toEqual([completed])
    expect(groups.current).toEqual([current])
    expect(groups.pending).toEqual([pending])
  })
})

describe('completionRate', () => {
  it('returns null when there is no target', () => {
    const assignment = makeAssignment({ progress_value: 5, kpi: { id: 1, name: 'A', target_value: null, unit: null, created_by: 1 } })
    expect(completionRate(assignment)).toBeNull()
  })

  it('caps at 100 when progress exceeds target', () => {
    const assignment = makeAssignment({ progress_value: 15, kpi: { id: 1, name: 'A', target_value: 10, unit: null, created_by: 1 } })
    expect(completionRate(assignment)).toBe(100)
  })

  it('rounds a partial completion percentage', () => {
    const assignment = makeAssignment({ progress_value: 1, kpi: { id: 1, name: 'A', target_value: 3, unit: null, created_by: 1 } })
    expect(completionRate(assignment)).toBe(33)
  })
})

describe('assignmentLabel', () => {
  it('includes the assigned user name', () => {
    const assignment = makeAssignment({
      kpi: { id: 1, name: 'Bugs Resolved', target_value: 10, unit: null, created_by: 1 },
      user: { id: 2, name: 'Jane Employee' },
    })
    expect(assignmentLabel(assignment)).toBe('Bugs Resolved — Jane Employee')
  })

  it('includes the assigned department name', () => {
    const assignment = makeAssignment({
      kpi: { id: 1, name: 'Campaigns', target_value: null, unit: null, created_by: 1 },
      department: { id: 7, name: 'Marketing' },
    })
    expect(assignmentLabel(assignment)).toBe('Campaigns — Marketing (dept.)')
  })

  it('falls back to just the KPI name', () => {
    const assignment = makeAssignment({ kpi: { id: 1, name: 'Bugs Resolved', target_value: 10, unit: null, created_by: 1 } })
    expect(assignmentLabel(assignment)).toBe('Bugs Resolved')
  })
})
