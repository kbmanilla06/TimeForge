import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/apiClient'
import { downloadBlob } from '../lib/download'
import { exportTeamHoursExcel, exportTeamHoursPdf } from '../lib/reportsApi'
import {
  approveTimesheet,
  listTeamTimesheets,
  rejectTimesheet,
  reopenTimesheet,
  requestRevision,
} from '../lib/timesheetApi'
import type { Timesheet } from '../types/timesheet'

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function TeamTimesheetsPage() {
  const { user } = useAuth()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      setTimesheets(await listTeamTimesheets())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load team timesheets.')
    } finally {
      setIsLoading(false)
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

  if (isLoading) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Team Timesheets</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Export Hours PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Export Hours Excel
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-6">
        {timesheets.map((timesheet) => (
          <div key={timesheet.id} className="rounded-md border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {timesheet.user?.name ?? `User #${timesheet.user_id}`} — {timesheet.date}
                </p>
                <p className="text-sm text-slate-500">Status: {timesheet.status}</p>
              </div>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {(timesheet.time_entries ?? []).map((entry) => (
                <li key={entry.id}>
                  {entry.task} — {formatMinutes(entry.duration_minutes)}
                </li>
              ))}
            </ul>

            {(timesheet.comments ?? []).length > 0 && (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
                {(timesheet.comments ?? []).map((comment) => (
                  <p key={comment.id} className="text-slate-600">
                    <span className="font-medium">{comment.author?.name ?? 'Reviewer'}</span> ({comment.action}):{' '}
                    {comment.comment ?? <em>no comment</em>}
                  </p>
                ))}
              </div>
            )}

            {timesheet.status === 'submitted' && (
              <div className="mt-3 space-y-2">
                <textarea
                  placeholder="Comment (required for reject/request revision)"
                  value={commentFor(timesheet.id)}
                  onChange={(e) => setComments({ ...comments, [timesheet.id]: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(timesheet)}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(timesheet)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestRevision(timesheet)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                  >
                    Request Revision
                  </button>
                </div>
              </div>
            )}

            {timesheet.status === 'approved' && user?.role === 'admin' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleReopen(timesheet)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                >
                  Reopen
                </button>
              </div>
            )}
          </div>
        ))}

        {timesheets.length === 0 && <p className="text-slate-400">No team timesheets yet.</p>}
      </div>
    </main>
  )
}
