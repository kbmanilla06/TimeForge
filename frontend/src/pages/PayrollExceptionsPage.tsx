import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { downloadBlob } from '../lib/download'
import {
  exportPayrollExceptionsExcel,
  exportPayrollExceptionsPdf,
  getPayrollExceptions,
} from '../lib/payrollExceptionApi'
import type { PayrollExceptionRow } from '../types/payrollException'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

function countOrDash(value: number): string {
  return value > 0 ? String(value) : '—'
}

export function PayrollExceptionsPage() {
  const [rows, setRows] = useState<PayrollExceptionRow[]>([])
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
      setRows(await getPayrollExceptions(forDate))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load payroll exceptions.')
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
      const blob = await exportPayrollExceptionsPdf(date || undefined)
      downloadBlob(blob, 'payroll-exceptions-report.pdf')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export the payroll exceptions report.')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleExportExcel() {
    setError(null)
    setIsExporting(true)
    try {
      const blob = await exportPayrollExceptionsExcel(date || undefined)
      downloadBlob(blob, 'payroll-exceptions-report.xlsx')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export the payroll exceptions report.')
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Payroll Exceptions"
        subtitle="Employees with a potential payroll problem for the selected period. Nothing here is auto-corrected or notified automatically."
        actions={
          <>
            <TextInput
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-auto"
              aria-label="Period date"
            />
            <Button variant="secondary" onClick={handleExportPdf} disabled={isExporting}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={handleExportExcel} disabled={isExporting}>
              Export Excel
            </Button>
          </>
        }
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState>No payroll exceptions found for this period.</EmptyState>
      ) : (
        <TableCard>
          <TableHead>
            <Th>Employee</Th>
            <Th>Department</Th>
            <Th>Missing Rate</Th>
            <Th>Unapproved Submitted</Th>
            <Th>Rejected/Revision</Th>
            <Th>Attendance w/o Entries</Th>
            <Th>Entries w/o Submission</Th>
            <Th>Overtime Over Threshold</Th>
          </TableHead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.user_id}>
                <Td className="font-medium text-ink">{row.name}</Td>
                <Td className="text-muted">{row.department ?? '—'}</Td>
                <Td>{row.missing_hourly_rate ? 'Yes' : '—'}</Td>
                <Td>{countOrDash(row.unapproved_submitted_count)}</Td>
                <Td>{countOrDash(row.rejected_or_revision_count)}</Td>
                <Td>{countOrDash(row.attendance_without_entries_days)}</Td>
                <Td>{countOrDash(row.entries_without_submission_days)}</Td>
                <Td>{row.overtime_over_threshold ? `${row.overtime_hours} hrs` : '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
