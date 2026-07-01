import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as scrumApi from '../lib/scrumApi'
import { DailyScrumPage } from './DailyScrumPage'

vi.mock('../lib/scrumApi')

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

describe('DailyScrumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders past entries with previous/planned/blockers/notes', async () => {
    vi.mocked(scrumApi.listMyScrums).mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        date: '2026-01-13',
        previous_work: 'Finished login page.',
        planned_work: 'Start dashboard.',
        blockers: 'Waiting on API keys.',
        notes: 'None.',
      },
    ])

    render(<DailyScrumPage />)

    expect(await screen.findByText('2026-01-13')).toBeInTheDocument()
    expect(screen.getByText(/Finished login page\./)).toBeInTheDocument()
    expect(screen.getByText(/Waiting on API keys\./)).toBeInTheDocument()
  })

  it('submits a new entry for today', async () => {
    const user = userEvent.setup()
    vi.mocked(scrumApi.listMyScrums).mockResolvedValue([])
    vi.mocked(scrumApi.submitScrum).mockResolvedValue({
      id: 2,
      user_id: 1,
      date: isoToday(),
      previous_work: 'Did the thing.',
      planned_work: 'Do the next thing.',
      blockers: null,
      notes: null,
    })

    render(<DailyScrumPage />)
    await screen.findByRole('button', { name: 'Submit' })

    await user.type(screen.getByPlaceholderText('Work completed the previous working day'), 'Did the thing.')
    await user.type(screen.getByPlaceholderText('Planned activities for today'), 'Do the next thing.')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(scrumApi.submitScrum).toHaveBeenCalledWith({
        date: isoToday(),
        previous_work: 'Did the thing.',
        planned_work: 'Do the next thing.',
        blockers: null,
        notes: null,
      })
    })
  })

  it('disables the form and shows a locked message once todays entry has a comment', async () => {
    vi.mocked(scrumApi.listMyScrums).mockResolvedValue([
      {
        id: 3,
        user_id: 1,
        date: isoToday(),
        previous_work: 'Did the thing.',
        planned_work: 'Do the next thing.',
        blockers: null,
        notes: null,
        comments: [
          {
            id: 1,
            daily_scrum_id: 3,
            author_id: 2,
            comment: 'Great work.',
            author: { id: 2, name: 'Sam Supervisor' },
            created_at: '2026-01-14T10:00:00Z',
          },
        ],
      },
    ])

    render(<DailyScrumPage />)

    expect(await screen.findByText(/reviewed and can no longer be edited/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByPlaceholderText('Work completed the previous working day')).toBeDisabled()
  })

  it('shows an empty state when there are no entries', async () => {
    vi.mocked(scrumApi.listMyScrums).mockResolvedValue([])

    render(<DailyScrumPage />)

    expect(await screen.findByText('No entries yet.')).toBeInTheDocument()
  })
})
