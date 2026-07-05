import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as holidayApi from '../../lib/holidayApi'
import { HolidaysPage } from './HolidaysPage'

vi.mock('../../lib/holidayApi')

describe('HolidaysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([
      { id: 1, date: '2026-12-25', name: 'Christmas', created_by: 1 },
      { id: 2, date: '2026-01-01', name: "New Year's Day", created_by: 1 },
    ])
  })

  it('renders holidays with their dates', async () => {
    render(<HolidaysPage />)

    expect(await screen.findByText('Christmas')).toBeInTheDocument()
    expect(screen.getByText("New Year's Day")).toBeInTheDocument()
  })

  it('creates a new holiday and reloads the list', async () => {
    const user = userEvent.setup()
    vi.mocked(holidayApi.createHoliday).mockResolvedValue({
      id: 3,
      date: '2026-07-04',
      name: 'Independence Day',
      created_by: 1,
    })

    render(<HolidaysPage />)
    await screen.findByText('Christmas')

    await user.type(screen.getByLabelText('Holiday date'), '2026-07-04')
    await user.type(screen.getByPlaceholderText('Holiday name'), 'Independence Day')
    await user.click(screen.getByRole('button', { name: 'Add Holiday' }))

    await waitFor(() => {
      expect(holidayApi.createHoliday).toHaveBeenCalledWith({ date: '2026-07-04', name: 'Independence Day' })
    })
    expect(holidayApi.listHolidays).toHaveBeenCalledTimes(2)
  })

  it('edits a holiday name and saves it', async () => {
    const user = userEvent.setup()
    vi.mocked(holidayApi.updateHoliday).mockResolvedValue({
      id: 1,
      date: '2026-12-25',
      name: 'Christmas Day',
      created_by: 1,
    })

    render(<HolidaysPage />)
    await screen.findByText('Christmas')

    const editButtons = screen.getAllByRole('button', { name: 'Edit' })
    await user.click(editButtons[0])

    const nameInput = screen.getByDisplayValue('Christmas')
    await user.clear(nameInput)
    await user.type(nameInput, 'Christmas Day')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(holidayApi.updateHoliday).toHaveBeenCalledWith(1, { date: '2026-12-25', name: 'Christmas Day' })
    })
  })

  it('deletes a holiday after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(holidayApi.deleteHoliday).mockResolvedValue(null)

    render(<HolidaysPage />)
    await screen.findByText('Christmas')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalledWith('Delete "Christmas"?')
    expect(holidayApi.deleteHoliday).toHaveBeenCalledWith(1)
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<HolidaysPage />)
    await screen.findByText('Christmas')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(holidayApi.deleteHoliday).not.toHaveBeenCalled()
  })

  it('shows an empty-state message when there are no holidays yet', async () => {
    vi.mocked(holidayApi.listHolidays).mockResolvedValue([])
    render(<HolidaysPage />)

    expect(await screen.findByText('No holidays yet.')).toBeInTheDocument()
  })
})
