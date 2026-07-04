import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as scrumApi from '../lib/scrumApi'
import { TeamScrumPage } from './TeamScrumPage'

vi.mock('../lib/scrumApi')

async function expandJaneEmployee() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /Jane Employee/ }))
  return user
}

describe('TeamScrumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one collapsed card per employee, with entries hidden until expanded', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([
      {
        id: 1,
        user_id: 2,
        date: '2026-01-14',
        previous_work: 'Built the feature.',
        planned_work: 'Write tests.',
        blockers: 'Blocked on design review.',
        notes: null,
        user: { id: 2, name: 'Jane Employee' },
      },
    ])

    render(<TeamScrumPage />)

    expect(await screen.findByText('Jane Employee')).toBeInTheDocument()
    expect(screen.getByText('1 entry')).toBeInTheDocument()
    expect(screen.queryByText(/Built the feature\./)).not.toBeInTheDocument()

    await expandJaneEmployee()

    expect(await screen.findByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Blockers')).toBeInTheDocument()
    expect(screen.getByText(/Built the feature\./)).toBeInTheDocument()
    expect(screen.getByText(/Write tests\./)).toBeInTheDocument()
    expect(screen.getByText(/Blocked on design review\./)).toBeInTheDocument()
  })

  it('groups multiple submissions from the same employee under one card', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([
      {
        id: 1,
        user_id: 2,
        date: '2026-01-15',
        previous_work: 'Day two work.',
        planned_work: 'Day two plan.',
        blockers: null,
        notes: null,
        user: { id: 2, name: 'Jane Employee' },
      },
      {
        id: 2,
        user_id: 2,
        date: '2026-01-14',
        previous_work: 'Day one work.',
        planned_work: 'Day one plan.',
        blockers: null,
        notes: null,
        user: { id: 2, name: 'Jane Employee' },
      },
    ])

    render(<TeamScrumPage />)

    expect(await screen.findByText('2 entries')).toBeInTheDocument()
    await expandJaneEmployee()

    const dates = await screen.findAllByText(/2026-01-1[45]/)
    expect(dates.map((el) => el.textContent)).toEqual(['2026-01-15', '2026-01-14'])
  })

  it('shows a placeholder when there are no blockers, and renders notes as a section', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([
      {
        id: 1,
        user_id: 2,
        date: '2026-01-14',
        previous_work: 'Built the feature.',
        planned_work: 'Write tests.',
        blockers: null,
        notes: 'Remote today.',
        user: { id: 2, name: 'Jane Employee' },
      },
    ])

    render(<TeamScrumPage />)
    await expandJaneEmployee()

    expect(await screen.findByText('No blockers reported.')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Remote today.')).toBeInTheDocument()
  })

  it('adds a comment to an entry', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([
      {
        id: 1,
        user_id: 2,
        date: '2026-01-14',
        previous_work: 'Built the feature.',
        planned_work: 'Write tests.',
        blockers: null,
        notes: null,
        user: { id: 2, name: 'Jane Employee' },
      },
    ])
    vi.mocked(scrumApi.addScrumComment).mockResolvedValue({
      id: 1,
      user_id: 2,
      date: '2026-01-14',
      previous_work: 'Built the feature.',
      planned_work: 'Write tests.',
      blockers: null,
      notes: null,
      comments: [
        {
          id: 1,
          daily_scrum_id: 1,
          author_id: 3,
          comment: 'Nice work.',
          author: { id: 3, name: 'Sam Supervisor' },
          created_at: '2026-01-14T11:00:00Z',
        },
      ],
    })

    render(<TeamScrumPage />)
    const user = await expandJaneEmployee()

    await user.type(screen.getByPlaceholderText('Add a comment'), 'Nice work.')
    await user.click(screen.getByRole('button', { name: 'Comment' }))

    await waitFor(() => {
      expect(scrumApi.addScrumComment).toHaveBeenCalledWith(1, { comment: 'Nice work.' })
    })
  })

  it('renders existing comment history', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([
      {
        id: 1,
        user_id: 2,
        date: '2026-01-14',
        previous_work: 'Built the feature.',
        planned_work: 'Write tests.',
        blockers: null,
        notes: null,
        user: { id: 2, name: 'Jane Employee' },
        comments: [
          {
            id: 1,
            daily_scrum_id: 1,
            author_id: 3,
            comment: 'Nice work.',
            author: { id: 3, name: 'Sam Supervisor' },
            created_at: '2026-01-14T11:00:00Z',
          },
        ],
      },
    ])

    render(<TeamScrumPage />)
    await expandJaneEmployee()

    expect(await screen.findByText(/Nice work\./)).toBeInTheDocument()
    expect(screen.getByText(/Sam Supervisor/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no team entries', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([])

    render(<TeamScrumPage />)

    expect(await screen.findByText('No scrum entries yet.')).toBeInTheDocument()
  })
})
