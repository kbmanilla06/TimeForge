import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../lib/apiClient'
import { downloadBlob } from '../lib/download'
import { exportTeamHoursExcel, exportTeamHoursPdf } from '../lib/reportsApi'
import { downloadAttachment } from '../lib/timeEntryApi'
import {
  approveTimesheet,
  listTeamTimesheets,
  rejectTimesheet,
  reopenTimesheet,
  requestRevision,
} from '../lib/timesheetApi'
import type { TimeEntry, TimeEntryAttachment } from '../types/timeEntry'
import type { Timesheet } from '../types/timesheet'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

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

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
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

      <div className="space-y-4">
        {timesheets.map((timesheet) => (
          <div key={timesheet.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">
                  {timesheet.user?.name ?? `User #${timesheet.user_id}`} — {timesheet.date}
                </p>
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

        {timesheets.length === 0 && <EmptyState>No team timesheets yet.</EmptyState>}
      </div>
    </main>
  )
}
