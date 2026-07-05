import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as download from '../lib/download'
import * as payrollApi from '../lib/payrollApi'
import { PayrollPage } from './PayrollPage'

vi.mock('../lib/payrollApi')
vi.mock('../lib/download')

function renderPage() {
  return render(
    <MemoryRouter>
      <PayrollPage />
    </MemoryRouter>,
  )
}

const baseRow = {
  user_id: 1,
  name: 'Jane Employee',
  department: 'Engineering',
  hourly_rate: 20,
  approved_minutes: 1080,
  regular_minutes: 960,
  overtime_minutes: 120,
  pending_minutes: 0,
  rejected_minutes: 0,
  attendance_days: 2,
  estimated_payroll: 370,
  period_start: '2026-01-01',
  period_end: '2026-01-15',
}

describe('PayrollPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the payroll summary table with formatted hours and currency', async () => {
    vi.mocked(payrollApi.getPayrollSummary).mockResolvedValue([baseRow])

    renderPage()

    expect(await screen.findByText('Jane Employee')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('18.00')).toBeInTheDocument()
    expect(screen.getByText('2.00')).toBeInTheDocument()
    expect(screen.getByText('$370.00')).toBeInTheDocument()
    expect(screen.getByText('Period: 2026-01-01 – 2026-01-15')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Exceptions' })).toHaveAttribute(
      'href',
      '/payroll/exceptions',
    )
  })

  it('shows a dash for a missing hourly rate and estimated payroll', async () => {
    vi.mocked(payrollApi.getPayrollSummary).mockResolvedValue([
      { ...baseRow, hourly_rate: null, estimated_payroll: null },
    ])

    renderPage()
    await screen.findByText('Jane Employee')

    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('reloads the summary when the date picker changes', async () => {
    const user = userEvent.setup()
    vi.mocked(payrollApi.getPayrollSummary).mockResolvedValue([baseRow])

    renderPage()
    await screen.findByText('Jane Employee')

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput, '2026-01-20')

    await waitFor(() => {
      expect(payrollApi.getPayrollSummary).toHaveBeenLastCalledWith('2026-01-20')
    })
  })

  it('shows an empty state when there are no active employees', async () => {
    vi.mocked(payrollApi.getPayrollSummary).mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No active employees found.')).toBeInTheDocument()
  })

  it('exports a PDF and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(payrollApi.getPayrollSummary).mockResolvedValue([baseRow])
    const blob = new Blob(['pdf'])
    vi.mocked(payrollApi.exportPayrollPdf).mockResolvedValue(blob)

    renderPage()
    await screen.findByText('Jane Employee')

    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    await waitFor(() => {
      expect(payrollApi.exportPayrollPdf).toHaveBeenCalledWith(undefined)
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'payroll-report.pdf')
    })
  })

  it('exports an Excel file and triggers a download', async () => {
    const user = userEvent.setup()
    vi.mocked(payrollApi.getPayrollSummary).mockResolvedValue([baseRow])
    const blob = new Blob(['xlsx'])
    vi.mocked(payrollApi.exportPayrollExcel).mockResolvedValue(blob)

    renderPage()
    await screen.findByText('Jane Employee')

    await user.click(screen.getByRole('button', { name: 'Export Excel' }))

    await waitFor(() => {
      expect(payrollApi.exportPayrollExcel).toHaveBeenCalledWith(undefined)
      expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'payroll-report.xlsx')
    })
  })
})
