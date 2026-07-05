import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { downloadBlob } from '../lib/download'
import { exportPayrollExcel, exportPayrollPdf, getPayrollSummary } from '../lib/payrollApi'
import type { PayrollSummaryRow } from '../types/payroll'
import { Alert } from '../components/ui/Alert'
import { Button, ButtonLink } from '../components/ui/Button'
import { TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

function formatCurrency(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(2)}`
}

export function PayrollPage() {
  const [rows, setRows] = useState<PayrollSummaryRow[]>([])
  const [date, setDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load(forDate?: string) {
    setIsLoading(true)
    setError(null)
    try {
      setRows(await getPayrollSummary(forDate))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load payroll data.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleDateChange(value: string) {
    setDate(value)
    void load(value || undefined)
  }

  async function handleExportPdf() {
    setError(null)
    setIsExporting(true)
    try {
      const blob = await exportPayrollPdf(date || undefined)
      downloadBlob(blob, 'payroll-report.pdf')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export the payroll report.')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleExportExcel() {
    setError(null)
    setIsExporting(true)
    try {
      const blob = await exportPayrollExcel(date || undefined)
      downloadBlob(blob, 'payroll-report.xlsx')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export the payroll report.')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  const periodLabel = rows[0] ? `${rows[0].period_start} – ${rows[0].period_end}` : null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Payroll"
        subtitle={periodLabel ? `Period: ${periodLabel}` : undefined}
        actions={
          <>
            <TextInput
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-auto"
            />
            <Button variant="secondary" onClick={handleExportPdf} disabled={isExporting}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={handleExportExcel} disabled={isExporting}>
              Export Excel
            </Button>
            <ButtonLink to="/payroll/exceptions" variant="secondary">
              View Exceptions
            </ButtonLink>
          </>
        }
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <TableCard>
        <TableHead>
          <Th>Employee</Th>
          <Th>Department</Th>
          <Th>Hourly Rate</Th>
          <Th>Approved Hrs</Th>
          <Th>Overtime Hrs</Th>
          <Th>Pending Hrs</Th>
          <Th>Rejected Hrs</Th>
          <Th>Attendance</Th>
          <Th>Estimated Payroll</Th>
        </TableHead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.user_id}>
              <Td className="font-medium text-ink">{row.name}</Td>
              <Td className="text-muted">{row.department ?? '—'}</Td>
              <Td className="text-muted">
                {row.hourly_rate !== null ? `$${row.hourly_rate.toFixed(2)}` : '—'}
              </Td>
              <Td>{formatHours(row.approved_minutes)}</Td>
              <Td>{formatHours(row.overtime_minutes)}</Td>
              <Td>{formatHours(row.pending_minutes)}</Td>
              <Td>{formatHours(row.rejected_minutes)}</Td>
              <Td>{row.attendance_days}</Td>
              <Td className="font-medium text-ink">{formatCurrency(row.estimated_payroll)}</Td>
            </Tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-muted">
                No active employees found.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </main>
  )
}
