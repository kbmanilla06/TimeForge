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
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, SectionCard } from '../components/ui/Card'
import { TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

const CHART_COLOR = '#4f46e5'

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </Card>
  )
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
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {error && <Alert tone="error">{error}</Alert>}
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
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          <>
            <span>{data.scope === 'organization' ? 'Organization-wide' : `Department: ${data.department_name}`}</span>
            {' · '}
            <span>
              Period: {data.period_start} – {data.period_end}
            </span>
          </>
        }
        actions={
          <>
            <TextInput type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className="w-auto" />
            <Button variant="secondary" onClick={handleRefresh}>
              Refresh
            </Button>
          </>
        }
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Hours" value={formatHours(data.total_hours_minutes)} />
        <StatTile label="Pending Approvals" value={data.pending_approvals} />
        <StatTile label="Billable Hours" value={formatHours(data.billable_minutes)} />
        <StatTile label="Non-Billable Hours" value={formatHours(data.non_billable_minutes)} />
      </section>

      {data.payroll_summary && (
        <SectionCard title="Payroll Summary" className="mt-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Estimated Payroll</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {formatCurrency(data.payroll_summary.total_estimated_payroll)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Regular Hours</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {formatHours(data.payroll_summary.total_regular_minutes)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Overtime Hours</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {formatHours(data.payroll_summary.total_overtime_minutes)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Employees With Rate Set</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {data.payroll_summary.employees_with_rate_count} /{' '}
                {data.payroll_summary.employees_with_rate_count + data.payroll_summary.employees_without_rate_count}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Department Performance">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill={CHART_COLOR} name="Approved Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Project Allocation">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill={CHART_COLOR} name="Approved Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {projectChartData.length === 0 && <p className="mt-2 text-sm text-muted">No project hours yet.</p>}
        </SectionCard>
      </section>

      <div className="mt-6">
        <SectionCard title="Attendance Trend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="employees" stroke={CHART_COLOR} strokeWidth={2} name="Employees Logging Time" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="KPI Completion Rates">
          <div className="space-y-3">
            {data.kpi_completion_rates.map((kpi) => (
              <div key={kpi.kpi_assignment_id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {kpi.kpi_name} — {kpi.assignee}
                  </span>
                  <span className="text-muted">
                    {kpi.progress} / {kpi.target} ({kpi.completion_rate}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-field">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min(kpi.completion_rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {data.kpi_completion_rates.length === 0 && (
              <p className="text-sm text-muted">No KPIs with a target assigned yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-ink">Employee Productivity</h2>
        <TableCard>
          <TableHead>
            <Th>Employee</Th>
            <Th>Department</Th>
            <Th>Approved Hours</Th>
          </TableHead>
          <tbody>
            {data.employee_productivity.map((row) => (
              <Tr key={row.user_id}>
                <Td className="font-medium text-ink">{row.name}</Td>
                <Td className="text-muted">{row.department ?? '—'}</Td>
                <Td>{formatHours(row.approved_minutes)}</Td>
              </Tr>
            ))}
            {data.employee_productivity.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No employees in scope.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      </section>
    </main>
  )
}
