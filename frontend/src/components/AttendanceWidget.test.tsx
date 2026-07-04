import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as attendanceApi from '../lib/attendanceApi'
import type { AttendanceSession } from '../types/attendance'
import { AttendanceWidget } from './AttendanceWidget'

vi.mock('../lib/attendanceApi')

const CLOCKED_IN: AttendanceSession = {
  id: 1,
  date: '2026-07-06',
  time_in: '2026-07-06T09:00:00Z',
  break_started_at: null,
  break_resumed_at: null,
  time_out: null,
  is_on_break: false,
  has_used_break: false,
  is_timed_out: false,
  working_minutes: 0,
  break_minutes: 0,
  total_minutes: 0,
}

const ON_BREAK: AttendanceSession = { ...CLOCKED_IN, break_started_at: '2026-07-06T12:00:00Z', is_on_break: true, has_used_break: true }

const COMPLETED: AttendanceSession = {
  ...CLOCKED_IN,
  break_started_at: '2026-07-06T12:00:00Z',
  break_resumed_at: '2026-07-06T12:30:00Z',
  time_out: '2026-07-06T17:30:00Z',
  has_used_break: true,
  is_timed_out: true,
  working_minutes: 480,
  break_minutes: 30,
  total_minutes: 510,
}

describe('AttendanceWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a Time In button when no session exists yet', async () => {
    vi.mocked(attendanceApi.getTodaysAttendance).mockResolvedValue({ session: null })
    render(<AttendanceWidget />)

    expect(await screen.findByText("You haven't clocked in today.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Time In' })).toBeInTheDocument()
  })

  it('clocking in calls the API and switches to the clocked-in view', async () => {
    const user = userEvent.setup()
    vi.mocked(attendanceApi.getTodaysAttendance).mockResolvedValue({ session: null })
    vi.mocked(attendanceApi.timeIn).mockResolvedValue(CLOCKED_IN)
    render(<AttendanceWidget />)

    await user.click(await screen.findByRole('button', { name: 'Time In' }))

    await waitFor(() => expect(attendanceApi.timeIn).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: 'Pause Break' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Time Out' })).toBeInTheDocument()
  })

  it('offers Resume Break (not Pause Break) while on break, and still allows Time Out', async () => {
    vi.mocked(attendanceApi.getTodaysAttendance).mockResolvedValue({ session: ON_BREAK })
    render(<AttendanceWidget />)

    expect(await screen.findByRole('button', { name: 'Resume Break' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause Break' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Time Out' })).toBeInTheDocument()
  })

  it('hides Pause Break once the one-per-day break has been used', async () => {
    const clockedInBreakUsed = { ...CLOCKED_IN, has_used_break: true }
    vi.mocked(attendanceApi.getTodaysAttendance).mockResolvedValue({ session: clockedInBreakUsed })
    render(<AttendanceWidget />)

    await screen.findByRole('button', { name: 'Time Out' })
    expect(screen.queryByRole('button', { name: 'Pause Break' })).not.toBeInTheDocument()
  })

  it("shows today's recap with working/break/total hours once timed out, and no action buttons", async () => {
    vi.mocked(attendanceApi.getTodaysAttendance).mockResolvedValue({ session: COMPLETED })
    render(<AttendanceWidget />)

    expect(await screen.findByText("Today's attendance")).toBeInTheDocument()
    expect(screen.getByText('8h 0m')).toBeInTheDocument() // working
    expect(screen.getByText('0h 30m')).toBeInTheDocument() // break
    expect(screen.getByText('8h 30m')).toBeInTheDocument() // total
    expect(screen.queryByRole('button', { name: 'Time Out' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Time In' })).not.toBeInTheDocument()
  })

  it('shows an error message instead of vanishing when the initial load fails', async () => {
    vi.mocked(attendanceApi.getTodaysAttendance).mockRejectedValue(new Error('boom'))
    render(<AttendanceWidget />)

    expect(await screen.findByText('Unable to load attendance.')).toBeInTheDocument()
    // The widget itself (and a way to retry via Time In) must stay visible,
    // not silently render nothing.
    expect(screen.getByText('Attendance')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Time In' })).toBeInTheDocument()
  })

  it('surfaces an error message if an action is rejected', async () => {
    const user = userEvent.setup()
    vi.mocked(attendanceApi.getTodaysAttendance).mockResolvedValue({ session: CLOCKED_IN })
    vi.mocked(attendanceApi.pauseBreak).mockRejectedValue(new Error('Only one break is allowed per day.'))
    render(<AttendanceWidget />)

    await user.click(await screen.findByRole('button', { name: 'Pause Break' }))

    expect(await screen.findByText('Unable to update attendance.')).toBeInTheDocument()
  })
})
