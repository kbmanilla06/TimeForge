import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../lib/apiClient'
import { getDashboard } from '../lib/dashboardApi'
import { downloadBlob } from '../lib/download'
import { exportTeamHoursExcel, exportTeamHoursPdf, getTeamHoursTrend } from '../lib/reportsApi'
import {
  defaultTimesheetFilters,
  filterTimesheets,
  groupTimesheetsByEmployee,
  type TimesheetFilters,
} from '../lib/timesheetGrouping'
import { downloadAttachment } from '../lib/timeEntryApi'
import {
  approveTimesheet,
  listTeamTimesheets,
  rejectTimesheet,
  reopenTimesheet,
  requestRevision,
} from '../lib/timesheetApi'
import type { DashboardData, ProductivityTrendPoint } from '../types/dashboard'
import type { TimeEntry, TimeEntryAttachment } from '../types/timeEntry'
import type { Timesheet, TimesheetStatus } from '../types/timesheet'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, SectionCard } from '../components/ui/Card'
import { Select, Textarea, TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

const CHART_COLOR = '#1876f2'

const STATUS_OPTIONS: Array<{ value: TimesheetStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'revision_requested', label: 'Revision Requested' },
]

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </Card>
  )
}

export function TeamTimesheetsPage() {
  const { user } = useAuth()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [trend, setTrend] = useState<ProductivityTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState<TimesheetFilters>(defaultTimesheetFilters)
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set())

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const [timesheetList, dashboardData, trendData] = await Promise.all([
        listTeamTimesheets(),
        getDashboard(),
        getTeamHoursTrend(),
      ])
      setTimesheets(timesheetList)
      setDashboard(dashboardData)
      setTrend(trendData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load team timesheets.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAttachmentDownload(entry: TimeEntry, attachment: TimeEntryAttachment) {
    setError(null)
    try {
      downloadBlob(await downloadAttachment(entry.id, attachment.id), attachment.original_name)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to download the attachment.')
    }
  }

  function commentFor(timesheetId: number): string {
    return comments[timesheetId] ?? ''
  }

  async function handleApprove(timesheet: Timesheet) {
    setError(null)
    try {
      await approveTimesheet(timesheet.id, { comment: commentFor(timesheet.id) || null })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to approve timesheet.')
    }
  }

  async function handleReject(timesheet: Timesheet) {
    setError(null)
    try {
      await rejectTimesheet(timesheet.id, { comment: commentFor(timesheet.id) })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reject timesheet.')
    }
  }

  async function handleRequestRevision(timesheet: Timesheet) {
    setError(null)
    try {
      await requestRevision(timesheet.id, { comment: commentFor(timesheet.id) })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to request revision.')
    }
  }

  async function handleReopen(timesheet: Timesheet) {
    const confirmed = window.confirm(`Reopen the approved timesheet for ${timesheet.date}?`)
    if (!confirmed) return

    setError(null)
    try {
      await reopenTimesheet(timesheet.id, { comment: commentFor(timesheet.id) || null })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reopen timesheet.')
    }
  }

  async function handleExportPdf() {
    setError(null)
    setIsExporting(true)
    try {
      const blob = await exportTeamHoursPdf()
      downloadBlob(blob, 'team-hours-report.pdf')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export the team hours report.')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleExportExcel() {
    setError(null)
    setIsExporting(true)
    try {
      const blob = await exportTeamHoursExcel()
      downloadBlob(blob, 'team-hours-report.xlsx')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to export the team hours report.')
    } finally {
      setIsExporting(false)
    }
  }

  function toggleExpanded(userId: number) {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const filteredTimesheets = useMemo(() => filterTimesheets(timesheets, filters), [timesheets, filters])
  const groups = useMemo(() => groupTimesheetsByEmployee(filteredTimesheets), [filteredTimesheets])

  const departmentChartData = useMemo(
    () =>
      (dashboard?.department_performance ?? []).map((row) => ({
        name: row.department_name ?? 'Unassigned',
        hours: Math.round((row.approved_minutes / 60) * 100) / 100,
      })),
    [dashboard]
  )

  const employeeChartData = useMemo(
    () =>
      (dashboard?.employee_productivity ?? []).map((row) => ({
        name: row.name,
        hours: Math.round((row.approved_minutes / 60) * 100) / 100,
      })),
    [dashboard]
  )

  const attendanceChartData = useMemo(
    () => (dashboard?.attendance_trends ?? []).map((point) => ({ date: point.date, employees: point.employee_count })),
    [dashboard]
  )

  const trendChartData = useMemo(
    () => trend.map((point) => ({ period: point.period_start, hours: Math.round((point.approved_minutes / 60) * 100) / 100 })),
    [trend]
  )

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
        title="Team Timesheets"
        subtitle="Review, approve, and comment on your team's submitted days."
        actions={
          <>
            <Button variant="secondary" onClick={handleExportPdf} disabled={isExporting}>
              Export Hours PDF
            </Button>
            <Button variant="secondary" onClick={handleExportExcel} disabled={isExporting}>
              Export Hours Excel
            </Button>
          </>
        }
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {dashboard && (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Total Hours" value={formatHours(dashboard.total_hours_minutes)} />
            <StatTile label="Pending Approvals" value={dashboard.pending_approvals} />
            <StatTile label="Employees" value={dashboard.employee_productivity.length} />
            <StatTile
              label="Scope"
              value={dashboard.scope === 'organization' ? 'Organization' : dashboard.department_name ?? '—'}
            />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Department Progress">
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

            <SectionCard title="Employee Progress">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="hours" fill={CHART_COLOR} name="Approved Hours" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Attendance Trend">
              <div className="h-56">
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

            <SectionCard title="Productivity Trend">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke={CHART_COLOR} strokeWidth={2} name="Approved Hours" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </section>

          <div className="mt-6">
            <SectionCard title="Completion Rate">
              <div className="space-y-3">
                {dashboard.kpi_completion_rates.map((kpi) => (
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
                {dashboard.kpi_completion_rates.length === 0 && (
                  <p className="text-sm text-muted">No KPIs with a target assigned yet.</p>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      <Card className="mb-4 mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as TimesheetStatus | 'all' })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <TextInput
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            aria-label="From date"
          />
          <TextInput
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            aria-label="To date"
          />
        </div>
      </Card>

      <div className="space-y-4">
        {groups.map((group) => {
          const isExpanded = expandedUsers.has(group.userId)

          return (
            <div key={group.userId} className="rounded-2xl border border-line bg-white shadow-card">
              <button
                type="button"
                onClick={() => toggleExpanded(group.userId)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-4 text-left"
              >
                <div>
                  <p className="font-medium text-ink">{group.userName}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatMinutes(group.totalMinutes)} total · {group.timesheets.length} day
                    {group.timesheets.length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary">{isExpanded ? 'Collapse' : 'Expand'}</span>
              </button>

              {isExpanded && (
                <div className="space-y-4 border-t border-line px-5 py-4">
                  {group.timesheets.map((timesheet) => (
                    <div key={timesheet.id} className="rounded-xl border border-line bg-field/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink">{timesheet.date}</p>
                          <p className="mt-0.5 text-sm text-muted">Status: {timesheet.status}</p>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-1 text-sm text-ink">
                        {(timesheet.time_entries ?? []).map((entry) => (
                          <li key={entry.id}>
                            {entry.task} — {formatMinutes(entry.duration_minutes)}
                            {(entry.attachments ?? []).map((attachment) => (
                              <button
                                key={attachment.id}
                                type="button"
                                onClick={() => void handleAttachmentDownload(entry, attachment)}
                                className="ml-2 font-medium text-primary hover:underline"
                              >
                                {attachment.original_name}
                              </button>
                            ))}
                          </li>
                        ))}
                      </ul>

                      {(timesheet.comments ?? []).length > 0 && (
                        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                          {(timesheet.comments ?? []).map((comment) => (
                            <p key={comment.id} className="text-muted">
                              <span className="font-medium text-ink">{comment.author?.name ?? 'Reviewer'}</span>{' '}
                              ({comment.action}): {comment.comment ?? <em>no comment</em>}
                            </p>
                          ))}
                        </div>
                      )}

                      {timesheet.status === 'submitted' && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            placeholder="Comment (required for reject/request revision)"
                            value={commentFor(timesheet.id)}
                            onChange={(e) => setComments({ ...comments, [timesheet.id]: e.target.value })}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleApprove(timesheet)}>
                              Approve
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleReject(timesheet)}>
                              Reject
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleRequestRevision(timesheet)}>
                              Request Revision
                            </Button>
                          </div>
                        </div>
                      )}

                      {timesheet.status === 'approved' && user?.role === 'admin' && (
                        <div className="mt-4">
                          <Button variant="secondary" size="sm" onClick={() => handleReopen(timesheet)}>
                            Reopen
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {groups.length === 0 && timesheets.length === 0 && <EmptyState>No team timesheets yet.</EmptyState>}
        {groups.length === 0 && timesheets.length > 0 && <EmptyState>No timesheets match the current filters.</EmptyState>}
      </div>
    </main>
  )
}
