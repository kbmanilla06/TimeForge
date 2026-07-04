import { describe, expect, it } from 'vitest'
import type { Timesheet } from '../types/timesheet'
import { defaultTimesheetFilters, filterTimesheets, groupTimesheetsByEmployee } from './timesheetGrouping'

function makeTimesheet(overrides: Partial<Timesheet>): Timesheet {
  return {
    id: 1,
    user_id: 1,
    date: '2026-07-01',
    status: 'submitted',
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    ...overrides,
  }
}

describe('groupTimesheetsByEmployee', () => {
  it('groups timesheets by user and sums entry minutes', () => {
    const groups = groupTimesheetsByEmployee([
      makeTimesheet({
        id: 1,
        user_id: 2,
        date: '2026-07-02',
        user: { id: 2, name: 'Jane Employee' },
        time_entries: [{ id: 1, duration_minutes: 60 } as never],
      }),
      makeTimesheet({
        id: 2,
        user_id: 2,
        date: '2026-07-01',
        user: { id: 2, name: 'Jane Employee' },
        time_entries: [{ id: 2, duration_minutes: 120 } as never],
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].userName).toBe('Jane Employee')
    expect(groups[0].totalMinutes).toBe(180)
  })

  it('preserves each employee\'s existing chronological order', () => {
    const newest = makeTimesheet({ id: 1, user_id: 2, date: '2026-07-02' })
    const oldest = makeTimesheet({ id: 2, user_id: 2, date: '2026-07-01' })

    const groups = groupTimesheetsByEmployee([newest, oldest])

    expect(groups[0].timesheets.map((t) => t.id)).toEqual([1, 2])
  })

  it('separates different employees into different groups', () => {
    const groups = groupTimesheetsByEmployee([
      makeTimesheet({ id: 1, user_id: 2, user: { id: 2, name: 'Bea' } }),
      makeTimesheet({ id: 2, user_id: 3, user: { id: 3, name: 'Amir' } }),
    ])

    expect(groups.map((g) => g.userName)).toEqual(['Amir', 'Bea'])
  })

  it('falls back to a user id label when no user relation is present', () => {
    const groups = groupTimesheetsByEmployee([makeTimesheet({ id: 1, user_id: 9, user: null })])
    expect(groups[0].userName).toBe('User #9')
  })
})

describe('filterTimesheets', () => {
  const submitted = makeTimesheet({ id: 1, status: 'submitted', date: '2026-07-05' })
  const approved = makeTimesheet({ id: 2, status: 'approved', date: '2026-07-10' })
  const rejected = makeTimesheet({ id: 3, status: 'rejected', date: '2026-07-15' })

  it('returns everything with the default filters', () => {
    expect(filterTimesheets([submitted, approved, rejected], defaultTimesheetFilters)).toHaveLength(3)
  })

  it('filters by status', () => {
    const result = filterTimesheets([submitted, approved, rejected], { ...defaultTimesheetFilters, status: 'approved' })
    expect(result).toEqual([approved])
  })

  it('filters by date range', () => {
    const result = filterTimesheets([submitted, approved, rejected], {
      ...defaultTimesheetFilters,
      startDate: '2026-07-06',
      endDate: '2026-07-12',
    })
    expect(result).toEqual([approved])
  })
})
