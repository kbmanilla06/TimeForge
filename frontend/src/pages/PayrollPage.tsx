import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { downloadBlob } from '../lib/download'
import { exportPayrollExcel, exportPayrollPdf, getPayrollSummary } from '../lib/payrollApi'
import type { PayrollSummaryRow } from '../types/payroll'

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
    return <p className="mx-auto max-w-5xl px-4 py-8 text-slate-500">Loading…</p>
  }

  const periodLabel = rows[0] ? `${rows[0].period_start} – ${rows[0].period_end}` : null

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Payroll</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      {periodLabel && <p className="mt-2 text-sm text-slate-500">Period: {periodLabel}</p>}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">Employee</th>
            <th className="py-2">Department</th>
            <th className="py-2">Hourly Rate</th>
            <th className="py-2">Approved Hrs</th>
            <th className="py-2">Overtime Hrs</th>
            <th className="py-2">Pending Hrs</th>
            <th className="py-2">Rejected Hrs</th>
            <th className="py-2">Attendance</th>
            <th className="py-2">Estimated Payroll</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user_id} className="border-b border-slate-100">
              <td className="py-2">{row.name}</td>
              <td className="py-2">{row.department ?? '—'}</td>
              <td className="py-2">{row.hourly_rate !== null ? `$${row.hourly_rate.toFixed(2)}` : '—'}</td>
              <td className="py-2">{formatHours(row.approved_minutes)}</td>
              <td className="py-2">{formatHours(row.overtime_minutes)}</td>
              <td className="py-2">{formatHours(row.pending_minutes)}</td>
              <td className="py-2">{formatHours(row.rejected_minutes)}</td>
              <td className="py-2">{row.attendance_days}</td>
              <td className="py-2">{formatCurrency(row.estimated_payroll)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="py-4 text-center text-slate-400">
                No active employees found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
