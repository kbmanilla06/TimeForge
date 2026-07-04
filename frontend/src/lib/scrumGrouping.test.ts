import { describe, expect, it } from 'vitest'
import type { DailyScrum } from '../types/scrum'
import { groupScrumsByEmployee } from './scrumGrouping'

function makeScrum(overrides: Partial<DailyScrum>): DailyScrum {
  return {
    id: 1,
    user_id: 1,
    date: '2026-07-01',
    previous_work: 'Did stuff.',
    planned_work: 'Do more stuff.',
    blockers: null,
    notes: null,
    ...overrides,
  }
}

describe('groupScrumsByEmployee', () => {
  it('groups entries by user', () => {
    const groups = groupScrumsByEmployee([
      makeScrum({ id: 1, user_id: 2, user: { id: 2, name: 'Jane Employee' } }),
      makeScrum({ id: 2, user_id: 2, user: { id: 2, name: 'Jane Employee' } }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].userName).toBe('Jane Employee')
    expect(groups[0].scrums).toHaveLength(2)
  })

  it('preserves each employee\'s existing chronological order', () => {
    const newest = makeScrum({ id: 1, user_id: 2, date: '2026-07-02' })
    const oldest = makeScrum({ id: 2, user_id: 2, date: '2026-07-01' })

    const groups = groupScrumsByEmployee([newest, oldest])

    expect(groups[0].scrums.map((s) => s.id)).toEqual([1, 2])
  })

  it('separates different employees into different groups, sorted by name', () => {
    const groups = groupScrumsByEmployee([
      makeScrum({ id: 1, user_id: 2, user: { id: 2, name: 'Bea' } }),
      makeScrum({ id: 2, user_id: 3, user: { id: 3, name: 'Amir' } }),
    ])

    expect(groups.map((g) => g.userName)).toEqual(['Amir', 'Bea'])
  })

  it('falls back to a user id label when no user relation is present', () => {
    const groups = groupScrumsByEmployee([makeScrum({ id: 1, user_id: 9, user: null })])
    expect(groups[0].userName).toBe('User #9')
  })
})
