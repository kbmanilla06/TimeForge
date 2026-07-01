import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ApiError } from '../lib/apiClient'
import { getDashboard } from '../lib/dashboardApi'
import type { DashboardData } from '../types/dashboard'

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [date, setDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load(forDate?: string) {
    setIsLoading(true)
    setError(null)
    try {
      setData(await getDashboard(forDate))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load the dashboard.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleDateChange(value: string) {
    setDate(value)
    void load(value || undefined)
  }

  function handleRefresh() {
    void load(date || undefined)
  }

  if (isLoading) {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-slate-500">Loading…</p>
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && <p className="text-sm text-red-600">{error}</p>}
      </main>
    )
  }

  const departmentChartData = data.department_performance.map((row) => ({
    name: row.department_name ?? 'Unassigned',
    hours: Math.round((row.approved_minutes / 60) * 100) / 100,
  }))

  const projectChartData = data.project_allocation.map((row) => ({
    name: row.project_name,
    hours: Math.round((row.approved_minutes / 60) * 100) / 100,
  }))

  const attendanceChartData = data.attendance_trends.map((point) => ({
    date: point.date,
    employees: point.employee_count,
  }))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span>{data.scope === 'organization' ? 'Organization-wide' : `Department: ${data.department_name}`}</span>
            {' · '}
            <span>
              Period: {data.period_start} – {data.period_end}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Hours</p>
          <p className="text-lg font-semibold text-slate-900">{formatHours(data.total_hours_minutes)}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Pending Approvals</p>
          <p className="text-lg font-semibold text-slate-900">{data.pending_approvals}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Billable Hours</p>
          <p className="text-lg font-semibold text-slate-900">{formatHours(data.billable_minutes)}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Non-Billable Hours</p>
          <p className="text-lg font-semibold text-slate-900">{formatHours(data.non_billable_minutes)}</p>
        </div>
      </section>

      {data.payroll_summary && (
        <section className="mt-6 rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-medium text-slate-900">Payroll Summary</h2>
          <div className="mt-3 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Estimated Payroll</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(data.payroll_summary.total_estimated_payroll)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Regular Hours</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatHours(data.payroll_summary.total_regular_minutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Overtime Hours</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatHours(data.payroll_summary.total_overtime_minutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Employees With Rate Set</p>
              <p className="text-lg font-semibold text-slate-900">
                {data.payroll_summary.employees_with_rate_count} / {data.payroll_summary.employees_with_rate_count + data.payroll_summary.employees_without_rate_count}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-medium text-slate-900">Department Performance</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#0f172a" name="Approved Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-medium text-slate-900">Project Allocation</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#0f172a" name="Approved Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {projectChartData.length === 0 && <p className="mt-2 text-sm text-slate-400">No project hours yet.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 p-4">
        <h2 className="text-lg font-medium text-slate-900">Attendance Trend</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="employees" stroke="#0f172a" name="Employees Logging Time" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 p-4">
        <h2 className="text-lg font-medium text-slate-900">KPI Completion Rates</h2>
        <div className="mt-3 space-y-3">
          {data.kpi_completion_rates.map((kpi) => (
            <div key={kpi.kpi_assignment_id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {kpi.kpi_name} — {kpi.assignee}
                </span>
                <span className="text-slate-500">
                  {kpi.progress} / {kpi.target} ({kpi.completion_rate}%)
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${Math.min(kpi.completion_rate, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {data.kpi_completion_rates.length === 0 && (
            <p className="text-sm text-slate-400">No KPIs with a target assigned yet.</p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-medium text-slate-900">Employee Productivity</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Employee</th>
              <th className="py-2">Department</th>
              <th className="py-2">Approved Hours</th>
            </tr>
          </thead>
          <tbody>
            {data.employee_productivity.map((row) => (
              <tr key={row.user_id} className="border-b border-slate-100">
                <td className="py-2">{row.name}</td>
                <td className="py-2">{row.department ?? '—'}</td>
                <td className="py-2">{formatHours(row.approved_minutes)}</td>
              </tr>
            ))}
            {data.employee_productivity.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No employees in scope.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
