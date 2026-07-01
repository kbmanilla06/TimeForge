import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as scrumApi from '../lib/scrumApi'
import { TeamScrumPage } from './TeamScrumPage'

vi.mock('../lib/scrumApi')

describe('TeamScrumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders team entries with employee, date, and blockers', async () => {
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

    expect(await screen.findByText(/Jane Employee/)).toBeInTheDocument()
    expect(screen.getByText(/Built the feature\./)).toBeInTheDocument()
    expect(screen.getByText(/Blocked on design review\./)).toBeInTheDocument()
  })

  it('adds a comment to an entry', async () => {
    const user = userEvent.setup()
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
    await screen.findByText(/Jane Employee/)

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

    expect(await screen.findByText(/Nice work\./)).toBeInTheDocument()
    expect(screen.getByText(/Sam Supervisor/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no team entries', async () => {
    vi.mocked(scrumApi.listTeamScrums).mockResolvedValue([])

    render(<TeamScrumPage />)

    expect(await screen.findByText('No scrum entries yet.')).toBeInTheDocument()
  })
})
