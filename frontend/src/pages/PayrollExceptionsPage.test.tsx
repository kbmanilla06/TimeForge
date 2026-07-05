import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as download from '../lib/download'
import * as payrollExceptionApi from '../lib/payrollExceptionApi'
import type { PayrollExceptionRow } from '../types/payrollException'
import { PayrollExceptionsPage } from './PayrollExceptionsPage'

vi.mock('../lib/payrollExceptionApi')
vi.mock('../lib/download')

const baseRow: PayrollExceptionRow = {
  user_id: 1,
  name: 'Jane Employee',
  department: 'Engineering',
  missing_hourly_rate: true,
  unapproved_submitted_count: 0,
  rejected_or_revision_count: 0,
  attendance_without_entries_days: 0,
  entries_without_submission_days: 0,
  overtime_over_threshold: false,
  overtime_hours: 0,
  has_any_exception: true,
}

describe('PayrollExceptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an exception row with the missing rate flagged', async () => {
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockResolvedValue([baseRow])

    render(<PayrollExceptionsPage />)

    expect(await screen.findByText('Jane Employee')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    const yesCells = screen.getAllByText('Yes')
    expect(yesCells.length).toBeGreaterThan(0)
  })

  it('shows counts for the other exception types', async () => {
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockResolvedValue([
      {
        ...baseRow,
        missing_hourly_rate: false,
        unapproved_submitted_count: 2,
        rejected_or_revision_count: 1,
        attendance_without_entries_days: 3,
        entries_without_submission_days: 4,
        overtime_over_threshold: true,
        overtime_hours: 5.5,
      },
    ])

    render(<PayrollExceptionsPage />)

    await screen.findByText('Jane Employee')
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5.5 hrs')).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no exceptions', async () => {
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockResolvedValue([])

    render(<PayrollExceptionsPage />)

    expect(await screen.findByText('No payroll exceptions found for this period.')).toBeInTheDocument()
  })

  it('reloads with the selected date', async () => {
    const user = userEvent.setup()
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockResolvedValue([baseRow])

    render(<PayrollExceptionsPage />)
    await screen.findByText('Jane Employee')

    const dateInput = screen.getByLabelText('Period date')
    await user.type(dateInput, '2026-01-20')

    await waitFor(() => {
      expect(payrollExceptionApi.getPayrollExceptions).toHaveBeenLastCalledWith('2026-01-20')
    })
  })

  it('exports a PDF and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockResolvedValue([baseRow])
    const blob = new Blob(['pdf'])
    vi.mocked(payrollExceptionApi.exportPayrollExceptionsPdf).mockResolvedValue(blob)

    render(<PayrollExceptionsPage />)
    await screen.findByText('Jane Employee')

    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    await waitFor(() => {
      expect(payrollExceptionApi.exportPayrollExceptionsPdf).toHaveBeenCalledWith(undefined)
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'payroll-exceptions-report.pdf')
    })
  })

  it('exports an Excel file and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockResolvedValue([baseRow])
    const blob = new Blob(['xlsx'])
    vi.mocked(payrollExceptionApi.exportPayrollExceptionsExcel).mockResolvedValue(blob)

    render(<PayrollExceptionsPage />)
    await screen.findByText('Jane Employee')

    await user.click(screen.getByRole('button', { name: 'Export Excel' }))

    await waitFor(() => {
      expect(payrollExceptionApi.exportPayrollExceptionsExcel).toHaveBeenCalledWith(undefined)
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'payroll-exceptions-report.xlsx')
    })
  })

  it('shows an error message when loading fails', async () => {
    const { ApiError } = await import('../lib/apiClient')
    vi.mocked(payrollExceptionApi.getPayrollExceptions).mockRejectedValue(
      new ApiError(403, 'You are not authorized to view payroll data.'),
    )

    render(<PayrollExceptionsPage />)

    expect(await screen.findByText('You are not authorized to view payroll data.')).toBeInTheDocument()
  })
})
