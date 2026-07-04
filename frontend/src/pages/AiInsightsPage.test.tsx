import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../lib/adminApi'
import * as aiApi from '../lib/aiApi'
import * as kpiApi from '../lib/kpiApi'
import type { AiOutput } from '../types/ai'
import { AiInsightsPage } from './AiInsightsPage'

vi.mock('../lib/aiApi')
vi.mock('../lib/kpiApi')
vi.mock('../lib/adminApi')

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function output(overrides: Partial<AiOutput> = {}): AiOutput {
  return {
    id: 1,
    type: 'daily_work_summary',
    user_id: 1,
    department_id: null,
    period_start: '2026-01-05',
    period_end: '2026-01-05',
    content: 'Daily work summary for Jane Employee on 2026-01-05.',
    provider: 'stub',
    prompt_version: 'daily_work_summary.v1',
    generated_by: 1,
    generated_by_name: 'Jane Employee',
    generated_at: '2026-01-05T10:00:00.000Z',
    ...overrides,
  }
}

describe('AiInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(aiApi.listAiOutputs).mockResolvedValue([])
    vi.mocked(kpiApi.listTeamMembers).mockResolvedValue([])
    vi.mocked(adminApi.listDepartments).mockResolvedValue([])
  })

  it('shows the latest output with an AI-generated badge for an employee', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Jane Employee', role: 'employee', department_id: null },
    })
    vi.mocked(aiApi.listAiOutputs).mockResolvedValue([output()])

    render(<AiInsightsPage />)

    expect(await screen.findByText(/Daily work summary for Jane Employee/)).toBeInTheDocument()
    expect(screen.getByText('AI-generated')).toBeInTheDocument()
    expect(screen.getByText(/provider: stub/)).toBeInTheDocument()
    expect(screen.queryByText('Recurring Blockers')).not.toBeInTheDocument()
    expect(kpiApi.listTeamMembers).not.toHaveBeenCalled()
    expect(aiApi.listAiOutputs).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'daily_work_summary', user_id: 1 }),
    )
  })

  it('generates on demand and switches the button to Regenerate', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Jane Employee', role: 'employee', department_id: null },
    })
    vi.mocked(aiApi.generateAiOutput).mockResolvedValue(
      output({ id: 9, content: 'Fresh summary content.' }),
    )

    render(<AiInsightsPage />)
    await screen.findByText(/Nothing generated yet/)

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(await screen.findByText('Fresh summary content.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument()
    expect(aiApi.generateAiOutput).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'daily_work_summary', user_id: 1 }),
    )
  })

  it('lists previous generations under the latest output', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Jane Employee', role: 'employee', department_id: null },
    })
    vi.mocked(aiApi.listAiOutputs).mockResolvedValue([
      output({ id: 2, content: 'Newest content.' }),
      output({ id: 1, content: 'Older content.' }),
    ])

    render(<AiInsightsPage />)

    expect(await screen.findByText('Newest content.')).toBeInTheDocument()
    expect(screen.getByText('Previous generations')).toBeInTheDocument()
    expect(screen.getByText('Older content.')).toBeInTheDocument()
  })

  it('requests the supervisor own-department blocker report from the Recurring Blockers tab', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: 'Sam Supervisor', role: 'supervisor', department_id: 5 },
    })
    vi.mocked(kpiApi.listTeamMembers).mockResolvedValue([
      { id: 2, name: 'Sam Supervisor', department_id: 5 },
    ])

    render(<AiInsightsPage />)
    await user.click(await screen.findByRole('button', { name: 'Recurring Blockers' }))

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'recurring_blockers', department_id: 5 }),
      )
    })
    expect(screen.getByText('Subject: your department')).toBeInTheDocument()
  })

  it('lets an admin pick a department for the blocker report', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 3, name: 'Ada Admin', role: 'admin', department_id: null },
    })
    vi.mocked(adminApi.listDepartments).mockResolvedValue([{ id: 7, name: 'Engineering', description: null }])

    render(<AiInsightsPage />)
    await user.click(await screen.findByRole('button', { name: 'Recurring Blockers' }))

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'recurring_blockers', department_id: 7 }),
      )
    })
    expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Jane Employee', role: 'employee', department_id: null },
    })
    vi.mocked(aiApi.listAiOutputs).mockRejectedValue(new Error('boom'))

    render(<AiInsightsPage />)

    expect(await screen.findByText('Unable to load AI outputs.')).toBeInTheDocument()
  })

  it('lets an employee query their own productivity trend', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Jane Employee', role: 'employee', department_id: null },
    })

    render(<AiInsightsPage />)
    await user.click(await screen.findByRole('button', { name: 'Productivity Trend' }))

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'productivity_trend_analysis', user_id: 1 }),
      )
    })
    expect(screen.queryByRole('button', { name: 'Payroll Validation' })).not.toBeInTheDocument()
  })

  it('shows hr_finance only the Payroll Validation tab with an organization-wide query', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 4, name: 'Hana Finance', role: 'hr_finance', department_id: null },
    })

    render(<AiInsightsPage />)

    expect(await screen.findByRole('button', { name: 'Payroll Validation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Daily Summary' })).not.toBeInTheDocument()
    expect(screen.getByText('Subject: entire organization')).toBeInTheDocument()
    expect(kpiApi.listTeamMembers).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalled()
    })
    const queryArg = vi.mocked(aiApi.listAiOutputs).mock.calls[0][0]
    expect(queryArg.type).toBe('payroll_validation')
    expect(queryArg).not.toHaveProperty('user_id')
    expect(queryArg).not.toHaveProperty('department_id')
  })

  it('lets a supervisor open KPI Analysis and Recommendations for their own department', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: 'Sam Supervisor', role: 'supervisor', department_id: 5 },
    })
    vi.mocked(kpiApi.listTeamMembers).mockResolvedValue([
      { id: 2, name: 'Sam Supervisor', department_id: 5 },
    ])

    render(<AiInsightsPage />)
    await user.click(await screen.findByRole('button', { name: 'KPI Analysis' }))

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'kpi_performance_analysis', department_id: 5 }),
      )
    })

    await user.click(screen.getByRole('button', { name: 'Recommendations' }))

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'supervisor_recommendations', department_id: 5 }),
      )
    })
    expect(screen.queryByRole('button', { name: 'Payroll Validation' })).not.toBeInTheDocument()
  })

  it('shows an admin all seven tabs including an organization-wide Payroll Validation', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 3, name: 'Ada Admin', role: 'admin', department_id: null },
    })
    vi.mocked(adminApi.listDepartments).mockResolvedValue([{ id: 7, name: 'Engineering', description: null }])

    render(<AiInsightsPage />)

    for (const label of [
      'Daily Summary',
      'Weekly Report',
      'Productivity Trend',
      'Recurring Blockers',
      'KPI Analysis',
      'Recommendations',
      'Payroll Validation',
    ]) {
      expect(await screen.findByRole('button', { name: label })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'Payroll Validation' }))

    await waitFor(() => {
      expect(aiApi.listAiOutputs).toHaveBeenCalledWith({
        type: 'payroll_validation',
        date: expect.any(String),
      })
    })
  })

  it('does not show the Ask AI toggle to an employee', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Jane Employee', role: 'employee', department_id: null },
    })

    render(<AiInsightsPage />)
    await screen.findByRole('button', { name: 'Daily Summary' })

    expect(screen.queryByRole('button', { name: 'Ask AI' })).not.toBeInTheDocument()
  })

  it('does not show the Ask AI toggle to hr_finance', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 4, name: 'Hana Finance', role: 'hr_finance', department_id: null },
    })

    render(<AiInsightsPage />)
    await screen.findByRole('button', { name: 'Payroll Validation' })

    expect(screen.queryByRole('button', { name: 'Ask AI' })).not.toBeInTheDocument()
  })

  it('lets a supervisor ask a question and renders the answer with chart and table', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: 'Sam Supervisor', role: 'supervisor', department_id: 5 },
    })
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

    render(<AiInsightsPage />)
    await user.click(await screen.findByRole('button', { name: 'Ask AI' }))
    await user.click(screen.getByRole('button', { name: "What is my team's progress?" }))

    expect(aiApi.askAssistant).toHaveBeenCalledWith("What is my team's progress?")
    expect(await screen.findByText('2 employees logged 8h 00m of approved work.')).toBeInTheDocument()
    expect(screen.getByText('Average KPI completion across scope: 50%.')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Jane' })).toBeInTheDocument()
  })

  it('shows the fallback message and supported examples for an unsupported question', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 3, name: 'Ada Admin', role: 'admin', department_id: null },
    })
    vi.mocked(aiApi.askAssistant).mockResolvedValue({
      question: 'What is the meaning of life?',
      category: 'unsupported',
      executive_summary: "I can't answer that yet.",
      detail: 'Try one of the supported questions below.',
      chart: null,
      table: null,
      recommendations: [],
      supported_examples: ["What is my team's progress?"],
      generated_at: '2026-07-04T10:00:00.000Z',
    })

    render(<AiInsightsPage />)
    await user.click(await screen.findByRole('button', { name: 'Ask AI' }))
    await user.type(screen.getByPlaceholderText(/What is my team's progress/), 'What is the meaning of life?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    expect(await screen.findByText("I can't answer that yet.")).toBeInTheDocument()
    expect(screen.getAllByText("What is my team's progress?").length).toBeGreaterThan(0)
  })
})
