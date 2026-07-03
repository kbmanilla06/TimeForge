import { Fragment, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiError } from '../lib/apiClient'
import { downloadBlob } from '../lib/download'
import {
  createTimeEntry,
  deleteAttachment,
  deleteTimeEntry,
  downloadAttachment,
  getSummary,
  listClientsForSelf,
  listProjectsForSelf,
  listTimeEntries,
  startTimer,
  stopTimer,
  updateTimeEntry,
  uploadAttachment,
} from '../lib/timeEntryApi'
import { listMyAssignments } from '../lib/kpiApi'
import { listMyTimesheets, submitTimesheet } from '../lib/timesheetApi'
import type { Client, Project } from '../types/admin'
import type { KpiAssignment } from '../types/kpi'
import {
  isTimeEntryLocked,
  type TimeEntry,
  type TimeEntryAttachment,
  type TimeEntryFormPayload,
  type TimeEntrySummary,
} from '../types/timeEntry'
import type { Timesheet } from '../types/timesheet'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, SectionCard } from '../components/ui/Card'
import { Select, Textarea, TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

const EMPTY_FORM = {
  date: '',
  startTime: '',
  endTime: '',
  projectId: '',
  clientId: '',
  task: '',
  workCategory: '',
  description: '',
  referenceLinks: '',
  deliverables: '',
  kpiAssignmentId: '',
  kpiProgressValue: '',
}

function kpiAssignmentLabel(assignment: KpiAssignment): string {
  const target = assignment.department ? `${assignment.department.name} (dept.)` : assignment.user?.name
  return `${assignment.kpi?.name ?? 'KPI'}${target ? ` — ${target}` : ''}`
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

function formatFileSize(sizeBytes: number): string {
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function toDatetimeLocal(value: string): string {
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function groupByDate(entries: TimeEntry[]): [string, TimeEntry[]][] {
  const groups = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const list = groups.get(entry.date) ?? []
    list.push(entry)
    groups.set(entry.date, list)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
}

export function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [summary, setSummary] = useState<TimeEntrySummary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<KpiAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingEntryId, setUploadingEntryId] = useState<number | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  const [timerTask, setTimerTask] = useState('')
  const [timerCategory, setTimerCategory] = useState('')
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProjectId, setTimerProjectId] = useState('')
  const [timerClientId, setTimerClientId] = useState('')
  const [timerKpiAssignmentId, setTimerKpiAssignmentId] = useState('')
  const [timerKpiProgressValue, setTimerKpiProgressValue] = useState('')
  const [timerError, setTimerError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const runningEntry = entries.find((entry) => entry.end_time === null) ?? null

  async function handleUploadAttachment(entry: TimeEntry, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingEntryId(entry.id)
    setAttachmentError(null)
    try {
      const attachment = await uploadAttachment(entry.id, file)
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id ? { ...item, attachments: [...(item.attachments ?? []), attachment] } : item,
        ),
      )
    } catch (err) {
      setAttachmentError(
        err instanceof ApiError
          ? (err.errors?.file?.[0] ?? err.message)
          : 'Unable to upload the attachment.',
      )
    } finally {
      setUploadingEntryId(null)
    }
  }

  async function handleDownloadAttachment(entry: TimeEntry, attachment: TimeEntryAttachment) {
    setAttachmentError(null)
    try {
      downloadBlob(await downloadAttachment(entry.id, attachment.id), attachment.original_name)
    } catch (err) {
      setAttachmentError(err instanceof ApiError ? err.message : 'Unable to download the attachment.')
    }
  }

  async function handleDeleteAttachment(entry: TimeEntry, attachment: TimeEntryAttachment) {
    setAttachmentError(null)
    try {
      await deleteAttachment(entry.id, attachment.id)
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id
            ? { ...item, attachments: (item.attachments ?? []).filter((a) => a.id !== attachment.id) }
            : item,
        ),
      )
    } catch (err) {
      setAttachmentError(err instanceof ApiError ? err.message : 'Unable to remove the attachment.')
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    if (!runningEntry) return undefined

    const startMs = new Date(runningEntry.start_time).getTime()
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [runningEntry])

  async function loadAll() {
    setIsLoading(true)
    setError(null)
    try {
      const [entryList, summaryData, projectList, clientList, timesheetList, assignmentList] = await Promise.all([
        listTimeEntries(),
        getSummary(),
        listProjectsForSelf(),
        listClientsForSelf(),
        listMyTimesheets(),
        listMyAssignments(),
      ])
      setEntries(entryList)
      setSummary(summaryData)
      setProjects(projectList)
      setClients(clientList)
      setTimesheets(timesheetList)
      setAssignments(assignmentList)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load time tracking data.')
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormErrors({})
  }

  function startEditing(entry: TimeEntry) {
    setEditingId(entry.id)
    setForm({
      date: entry.date,
      startTime: toDatetimeLocal(entry.start_time),
      endTime: entry.end_time ? toDatetimeLocal(entry.end_time) : '',
      projectId: entry.project_id ? String(entry.project_id) : '',
      clientId: entry.client_id ? String(entry.client_id) : '',
      task: entry.task,
      workCategory: entry.work_category,
      description: entry.description,
      referenceLinks: (entry.reference_links ?? []).join('\n'),
      deliverables: (entry.deliverables ?? []).join('\n'),
      kpiAssignmentId: entry.kpi_assignment_id ? String(entry.kpi_assignment_id) : '',
      kpiProgressValue: entry.kpi_progress_value !== null ? String(entry.kpi_progress_value) : '',
    })
  }

  function buildPayload(): TimeEntryFormPayload {
    const toList = (value: string) =>
      value
        ? value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : null

    return {
      date: form.date,
      start_time: form.startTime,
      end_time: form.endTime,
      project_id: form.projectId ? Number(form.projectId) : null,
      client_id: form.clientId ? Number(form.clientId) : null,
      task: form.task,
      work_category: form.workCategory,
      description: form.description,
      reference_links: toList(form.referenceLinks),
      deliverables: toList(form.deliverables),
      kpi_assignment_id: form.kpiAssignmentId ? Number(form.kpiAssignmentId) : null,
      kpi_progress_value: form.kpiProgressValue ? Number(form.kpiProgressValue) : null,
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormErrors({})
    setError(null)
    setIsSubmitting(true)

    try {
      if (editingId) {
        await updateTimeEntry(editingId, buildPayload())
      } else {
        await createTimeEntry(buildPayload())
      }
      resetForm()
      await loadAll()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFormErrors(err.errors)
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to save time entry.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(entry: TimeEntry) {
    const confirmed = window.confirm(`Delete this time entry for "${entry.task}"?`)
    if (!confirmed) return

    setError(null)
    try {
      await deleteTimeEntry(entry.id)
      await loadAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete time entry.')
    }
  }

  async function handleStartTimer(event: FormEvent) {
    event.preventDefault()
    setTimerError(null)

    try {
      await startTimer({
        task: timerTask,
        work_category: timerCategory,
        description: timerDescription,
        project_id: timerProjectId ? Number(timerProjectId) : null,
        client_id: timerClientId ? Number(timerClientId) : null,
        kpi_assignment_id: timerKpiAssignmentId ? Number(timerKpiAssignmentId) : null,
        kpi_progress_value: timerKpiProgressValue ? Number(timerKpiProgressValue) : null,
      })
      setTimerTask('')
      setTimerCategory('')
      setTimerDescription('')
      setTimerProjectId('')
      setTimerClientId('')
      setTimerKpiAssignmentId('')
      setTimerKpiProgressValue('')
      await loadAll()
    } catch (err) {
      setTimerError(err instanceof ApiError ? err.message : 'Unable to start timer.')
    }
  }

  async function handleStopTimer() {
    if (!runningEntry) return

    setTimerError(null)
    try {
      await stopTimer(runningEntry.id)
      await loadAll()
    } catch (err) {
      setTimerError(err instanceof ApiError ? err.message : 'Unable to stop timer.')
    }
  }

  async function handleSubmitTimesheet(date: string) {
    setError(null)
    try {
      await submitTimesheet({ date })
      await loadAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit timesheet.')
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader title="Time Tracking" subtitle="Log your work with a live timer or manual entries." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <SectionCard title="Timer">
        {timerError && (
          <Alert tone="error" className="mb-3">
            {timerError}
          </Alert>
        )}

        {runningEntry ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-3xl font-semibold text-ink">{formatElapsed(elapsedSeconds)}</p>
              <p className="mt-1 text-sm text-muted">{runningEntry.task}</p>
            </div>
            <Button variant="danger" onClick={handleStopTimer}>
              Stop
            </Button>
          </div>
        ) : (
          <form onSubmit={handleStartTimer} className="grid gap-3 sm:grid-cols-2">
            <TextInput
              type="text"
              required
              placeholder="Task"
              value={timerTask}
              onChange={(e) => setTimerTask(e.target.value)}
            />
            <TextInput
              type="text"
              required
              placeholder="Work category"
              value={timerCategory}
              onChange={(e) => setTimerCategory(e.target.value)}
            />
            <Select value={timerProjectId} onChange={(e) => setTimerProjectId(e.target.value)}>
              <option value="">— No project —</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select value={timerClientId} onChange={(e) => setTimerClientId(e.target.value)}>
              <option value="">— No client —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            <Select
              value={timerKpiAssignmentId}
              onChange={(e) => setTimerKpiAssignmentId(e.target.value)}
            >
              <option value="">— No KPI —</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {kpiAssignmentLabel(assignment)}
                </option>
              ))}
            </Select>
            <TextInput
              type="number"
              min="0"
              placeholder="KPI progress (e.g. 2)"
              value={timerKpiProgressValue}
              onChange={(e) => setTimerKpiProgressValue(e.target.value)}
              disabled={!timerKpiAssignmentId}
            />
            <Textarea
              required
              placeholder="Description"
              value={timerDescription}
              onChange={(e) => setTimerDescription(e.target.value)}
              className="sm:col-span-2"
            />
            <Button type="submit" className="sm:col-span-2">
              Start Timer
            </Button>
          </form>
        )}
      </SectionCard>

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Today</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatMinutes(summary.today_minutes)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">This Week</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatMinutes(summary.week_minutes)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">This Month</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatMinutes(summary.month_minutes)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Payroll Period ({summary.payroll_period_start} – {summary.payroll_period_end})
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {formatMinutes(summary.payroll_period_minutes)}
            </p>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <SectionCard title={editingId ? 'Edit Time Entry' : 'Add Manual Time Entry'}>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <TextInput
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <div className="hidden sm:block" />
            <label className="text-xs font-medium text-muted">
              Start
              <TextInput
                type="datetime-local"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium text-muted">
              End
              <TextInput
                type="datetime-local"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="mt-1"
              />
            </label>
            {formErrors.start_time && (
              <p className="text-sm text-red-600 sm:col-span-2">{formErrors.start_time[0]}</p>
            )}
            {formErrors.end_time && (
              <p className="text-sm text-red-600 sm:col-span-2">{formErrors.end_time[0]}</p>
            )}
            {formErrors.date && <p className="text-sm text-red-600 sm:col-span-2">{formErrors.date[0]}</p>}
            {formErrors.kpi_assignment_id && (
              <p className="text-sm text-red-600 sm:col-span-2">{formErrors.kpi_assignment_id[0]}</p>
            )}

            <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">— No project —</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">— No client —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Select
              value={form.kpiAssignmentId}
              onChange={(e) => setForm({ ...form, kpiAssignmentId: e.target.value })}
            >
              <option value="">— No KPI —</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {kpiAssignmentLabel(assignment)}
                </option>
              ))}
            </Select>
            <TextInput
              type="number"
              min="0"
              placeholder="KPI progress (e.g. 2)"
              value={form.kpiProgressValue}
              onChange={(e) => setForm({ ...form, kpiProgressValue: e.target.value })}
              disabled={!form.kpiAssignmentId}
            />

            <TextInput
              type="text"
              required
              placeholder="Task"
              value={form.task}
              onChange={(e) => setForm({ ...form, task: e.target.value })}
            />
            <TextInput
              type="text"
              required
              placeholder="Work category"
              value={form.workCategory}
              onChange={(e) => setForm({ ...form, workCategory: e.target.value })}
            />

            <Textarea
              required
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="sm:col-span-2"
            />

            <Textarea
              placeholder="Reference links (one per line)"
              value={form.referenceLinks}
              onChange={(e) => setForm({ ...form, referenceLinks: e.target.value })}
            />
            <Textarea
              placeholder="Deliverables (one per line)"
              value={form.deliverables}
              onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
            />

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Entry'}
              </Button>
              {editingId && (
                <Button variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </SectionCard>
      </div>

      <section className="mt-6 space-y-4">
        <h2 className="text-base font-semibold text-ink">My Time Entries</h2>
        {attachmentError && <Alert tone="error">{attachmentError}</Alert>}

        {groupByDate(entries).map(([date, dateEntries]) => {
          const timesheet = timesheets.find((t) => t.date === date)
          const canSubmit = !timesheet || timesheet.status === 'revision_requested'
          const hasRunningEntry = dateEntries.some((entry) => entry.end_time === null)

          return (
            <div key={date} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{date}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Status: {timesheet ? timesheet.status : 'not submitted'}
                  </p>
                </div>
                {canSubmit && (
                  <Button
                    size="sm"
                    onClick={() => handleSubmitTimesheet(date)}
                    disabled={hasRunningEntry}
                    title={hasRunningEntry ? 'Stop the running timer before submitting' : undefined}
                  >
                    Submit Timesheet
                  </Button>
                )}
              </div>

              {timesheet && (timesheet.comments ?? []).length > 0 && (
                <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                  {(timesheet.comments ?? []).map((comment) => (
                    <p key={comment.id} className="text-muted">
                      <span className="font-medium text-ink">{comment.author?.name ?? 'Reviewer'}</span>{' '}
                      ({comment.action}): {comment.comment ?? <em>no comment</em>}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-4 font-medium">Duration</th>
                      <th className="py-2 pr-4 font-medium">Project</th>
                      <th className="py-2 pr-4 font-medium">Task</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateEntries.map((entry) => {
                      const locked = isTimeEntryLocked(entry)
                      const disabled = !entry.end_time || locked

                      return (
                        <Fragment key={entry.id}>
                          <tr>
                            <td className="py-2 pr-4">
                              {entry.end_time ? formatMinutes(entry.duration_minutes) : 'Running…'}
                            </td>
                            <td className="py-2 pr-4 text-muted">{entry.project?.name ?? '—'}</td>
                            <td className="py-2 pr-4">{entry.task}</td>
                            <td className="space-x-3 whitespace-nowrap py-2">
                              <button
                                type="button"
                                onClick={() => startEditing(entry)}
                                disabled={disabled}
                                title={locked ? 'Locked — this timesheet has been submitted' : undefined}
                                className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry)}
                                disabled={disabled}
                                title={locked ? 'Locked — this timesheet has been submitted' : undefined}
                                className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                          <tr className="border-b border-line/60 last:border-b-0">
                            <td colSpan={4} className="pb-3 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-muted">Attachments:</span>
                                {(entry.attachments ?? []).map((attachment) => (
                                  <span
                                    key={attachment.id}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-field px-2.5 py-1"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => void handleDownloadAttachment(entry, attachment)}
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {attachment.original_name}
                                    </button>
                                    <span className="text-muted">({formatFileSize(attachment.size_bytes)})</span>
                                    {!locked && (
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteAttachment(entry, attachment)}
                                        className="font-medium text-red-600 hover:underline"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </span>
                                ))}
                                {(entry.attachments ?? []).length === 0 && (
                                  <span className="text-muted">none</span>
                                )}
                                {!locked && (
                                  <label className="cursor-pointer font-medium text-primary hover:underline">
                                    {uploadingEntryId === entry.id ? 'Uploading…' : 'Attach file'}
                                    <input
                                      type="file"
                                      accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                                      className="hidden"
                                      disabled={uploadingEntryId !== null}
                                      onChange={(e) => void handleUploadAttachment(entry, e)}
                                    />
                                  </label>
                                )}
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {entries.length === 0 && <EmptyState>No time entries yet.</EmptyState>}
      </section>
    </main>
  )
}
