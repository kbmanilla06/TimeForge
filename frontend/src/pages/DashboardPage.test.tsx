import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as dashboardApi from '../lib/dashboardApi'
import { DashboardPage } from './DashboardPage'

vi.mock('../lib/dashboardApi')

const orgWideData = {
  scope: 'organization' as const,
  department_name: null,
  period_start: '2026-01-01',
  period_end: '2026-01-15',
  total_hours_minutes: 600,
  employee_productivity: [
    { user_id: 1, name: 'Jane Employee', department: 'Engineering', approved_minutes: 600 },
  ],
  department_performance: [
    { department_id: 1, department_name: 'Engineering', approved_minutes: 600, average_kpi_completion_rate: 60 },
  ],
  pending_approvals: 2,
  kpi_completion_rates: [
    {
      kpi_assignment_id: 1,
      department_id: 1,
      kpi_name: 'Bugs Resolved',
      target: 10,
      progress: 6,
      completion_rate: 60,
      assignee: 'Jane Employee',
    },
  ],
  attendance_trends: [
    { date: '2026-01-05', employee_count: 1 },
    { date: '2026-01-06', employee_count: 0 },
  ],
  billable_minutes: 300,
  non_billable_minutes: 300,
  project_allocation: [{ project_id: 1, project_name: 'Website Redesign', approved_minutes: 300 }],
  payroll_summary: {
    total_estimated_payroll: 370,
    total_regular_minutes: 960,
    total_overtime_minutes: 120,
    employees_with_rate_count: 1,
    employees_without_rate_count: 1,
  },
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders summary cards, payroll summary, and productivity table', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(orgWideData)

    render(<DashboardPage />)

    expect(await screen.findByText('Organization-wide')).toBeInTheDocument()
    expect(screen.getAllByText('10.00').length).toBeGreaterThanOrEqual(1) // total hours + Jane's row
    expect(screen.getByText('2')).toBeInTheDocument() // pending approvals
    expect(screen.getByText('$370.00')).toBeInTheDocument()
    expect(screen.getByText('Jane Employee')).toBeInTheDocument()
    expect(screen.getByText(/Bugs Resolved/)).toBeInTheDocument()
  })

  it('does not render a payroll summary section when absent from the response', async () => {
    const { payroll_summary: _payrollSummary, ...departmentData } = orgWideData
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      ...departmentData,
      scope: 'department',
      department_name: 'Engineering',
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Department: Engineering')).toBeInTheDocument()
    expect(screen.queryByText('Payroll Summary')).not.toBeInTheDocument()
  })

  it('reloads the dashboard when the date picker changes', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(orgWideData)

    render(<DashboardPage />)
    await screen.findByText('Organization-wide')

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput, '2026-01-20')

    await waitFor(() => {
      expect(dashboardApi.getDashboard).toHaveBeenLastCalledWith('2026-01-20')
    })
  })

  it('refetches the same date when Refresh is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(orgWideData)

    render(<DashboardPage />)
    await screen.findByText('Organization-wide')

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(dashboardApi.getDashboard).toHaveBeenCalledTimes(2)
    })
  })
})
