import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as aiApi from '../lib/aiApi'
import { AiFloatingAssistant } from './AiFloatingAssistant'

vi.mock('../lib/aiApi')

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('AiFloatingAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing for an employee', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'employee' } })
    render(<AiFloatingAssistant />)

    expect(screen.queryByLabelText('Open AI Assistant')).not.toBeInTheDocument()
  })

  it('renders nothing for hr_finance', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'hr_finance' } })
    render(<AiFloatingAssistant />)

    expect(screen.queryByLabelText('Open AI Assistant')).not.toBeInTheDocument()
  })

  it('shows the floating button for a supervisor, closed by default', () => {
    mockUseAuth.mockReturnValue({ user: { id: 2, role: 'supervisor' } })
    render(<AiFloatingAssistant />)

    expect(screen.getByLabelText('Open AI Assistant')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'AI Assistant' })).not.toBeInTheDocument()
  })

  it('opens the chat panel and shows example questions when clicked', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { id: 3, role: 'admin' } })
    render(<AiFloatingAssistant />)

    await user.click(screen.getByLabelText('Open AI Assistant'))

    expect(screen.getByRole('dialog', { name: 'AI Assistant' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "What is my team's progress?" })).toBeInTheDocument()
  })

  it('asking a question appends a user bubble and then the answer to the conversation', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { id: 3, role: 'admin' } })
    vi.mocked(aiApi.askAssistant).mockResolvedValue({
      question: "What is my team's progress?",
      category: 'team_progress',
      executive_summary: '2 employees logged 8h 00m of approved work.',
      detail: 'Average KPI completion across scope: 50%.',
      chart: { type: 'bar', series_label: 'Approved Hours', points: [{ label: 'Jane', value: 8 }] },
      table: { columns: ['Employee', 'Approved Hours'], rows: [['Jane', 8]] },
      recommendations: [],
      supported_examples: null,
      generated_at: '2026-07-04T10:00:00.000Z',
    })

    render(<AiFloatingAssistant />)
    await user.click(screen.getByLabelText('Open AI Assistant'))
    await user.click(screen.getByRole('button', { name: "What is my team's progress?" }))

    expect(aiApi.askAssistant).toHaveBeenCalledWith("What is my team's progress?")
    expect(await screen.findByText('2 employees logged 8h 00m of approved work.')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Jane' })).toBeInTheDocument()
  })

  it('keeps a running conversation across multiple questions (session history)', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { id: 3, role: 'admin' } })
    vi.mocked(aiApi.askAssistant)
      .mockResolvedValueOnce({
        question: 'Show attendance trends.',
        category: 'attendance_trend',
        executive_summary: 'Attendance trend for the current period.',
        detail: 'Every day had at least one employee logging time.',
        chart: null,
        table: null,
        recommendations: [],
        supported_examples: null,
        generated_at: '2026-07-04T10:00:00.000Z',
      })
      .mockResolvedValueOnce({
        question: "Summarize today's scrum.",
        category: 'scrum_summary',
        executive_summary: '2 of 2 submitted today\'s scrum.',
        detail: 'Every team member has submitted today\'s scrum.',
        chart: null,
        table: null,
        recommendations: [],
        supported_examples: null,
        generated_at: '2026-07-04T10:05:00.000Z',
      })

    render(<AiFloatingAssistant />)
    await user.click(screen.getByLabelText('Open AI Assistant'))

    const input = screen.getByPlaceholderText('Ask a question…')
    await user.type(input, 'Show attendance trends.')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Attendance trend for the current period.')).toBeInTheDocument()

    await user.type(input, "Summarize today's scrum.")
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('2 of 2 submitted today\'s scrum.')).toBeInTheDocument()

    // Both exchanges remain visible in the thread — this is the "session history" requirement.
    expect(screen.getByText('Show attendance trends.')).toBeInTheDocument()
    expect(screen.getByText('Attendance trend for the current period.')).toBeInTheDocument()
    expect(screen.getByText("Summarize today's scrum.")).toBeInTheDocument()
  })

  it('shows an error bubble instead of losing the question when a request fails', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { id: 3, role: 'admin' } })
    const { ApiError } = await import('../lib/apiClient')
    vi.mocked(aiApi.askAssistant).mockRejectedValue(new ApiError(500, 'Something went wrong.'))

    render(<AiFloatingAssistant />)
    await user.click(screen.getByLabelText('Open AI Assistant'))

    const input = screen.getByPlaceholderText('Ask a question…')
    await user.type(input, 'Show attendance trends.')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText('Show attendance trends.')).toBeInTheDocument()
  })

  it('closes the panel when the toggle button is clicked again', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { id: 3, role: 'admin' } })
    render(<AiFloatingAssistant />)

    await user.click(screen.getByLabelText('Open AI Assistant'))
    expect(screen.getByRole('dialog', { name: 'AI Assistant' })).toBeInTheDocument()

    await user.click(screen.getByLabelText('Close AI Assistant'))
    expect(screen.queryByRole('dialog', { name: 'AI Assistant' })).not.toBeInTheDocument()
  })
})
