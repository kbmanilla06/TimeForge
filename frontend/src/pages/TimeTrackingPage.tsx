import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../lib/apiClient'
import {
  createTimeEntry,
  deleteTimeEntry,
  getSummary,
  listClientsForSelf,
  listProjectsForSelf,
  listTimeEntries,
  startTimer,
  stopTimer,
  updateTimeEntry,
} from '../lib/timeEntryApi'
import type { Client, Project } from '../types/admin'
import type { TimeEntry, TimeEntryFormPayload, TimeEntrySummary } from '../types/timeEntry'

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
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
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

export function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [summary, setSummary] = useState<TimeEntrySummary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [timerTask, setTimerTask] = useState('')
  const [timerCategory, setTimerCategory] = useState('')
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProjectId, setTimerProjectId] = useState('')
  const [timerClientId, setTimerClientId] = useState('')
  const [timerError, setTimerError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const runningEntry = entries.find((entry) => entry.end_time === null) ?? null

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
      const [entryList, summaryData, projectList, clientList] = await Promise.all([
        listTimeEntries(),
        getSummary(),
        listProjectsForSelf(),
        listClientsForSelf(),
      ])
      setEntries(entryList)
      setSummary(summaryData)
      setProjects(projectList)
      setClients(clientList)
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
      })
      setTimerTask('')
      setTimerCategory('')
      setTimerDescription('')
      setTimerProjectId('')
      setTimerClientId('')
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

  if (isLoading) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Time Tracking</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 rounded-md border border-slate-200 p-4">
        <h2 className="text-lg font-medium text-slate-900">Timer</h2>

        {timerError && <p className="mt-2 text-sm text-red-600">{timerError}</p>}

        {runningEntry ? (
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="font-mono text-2xl text-slate-900">{formatElapsed(elapsedSeconds)}</p>
              <p className="text-sm text-slate-500">{runningEntry.task}</p>
            </div>
            <button
              type="button"
              onClick={handleStopTimer}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Stop
            </button>
          </div>
        ) : (
          <form onSubmit={handleStartTimer} className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Task"
              value={timerTask}
              onChange={(e) => setTimerTask(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Work category"
              value={timerCategory}
              onChange={(e) => setTimerCategory(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={timerProjectId}
              onChange={(e) => setTimerProjectId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— No project —</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={timerClientId}
              onChange={(e) => setTimerClientId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— No client —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <textarea
              required
              placeholder="Description"
              value={timerDescription}
              onChange={(e) => setTimerDescription(e.target.value)}
              className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="col-span-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Start Timer
            </button>
          </form>
        )}
      </section>

      {summary && (
        <section className="mt-6 grid grid-cols-4 gap-4 rounded-md border border-slate-200 p-4">
          <div>
            <p className="text-xs text-slate-500">Today</p>
            <p className="text-lg font-semibold text-slate-900">{formatMinutes(summary.today_minutes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">This Week</p>
            <p className="text-lg font-semibold text-slate-900">{formatMinutes(summary.week_minutes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">This Month</p>
            <p className="text-lg font-semibold text-slate-900">{formatMinutes(summary.month_minutes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">
              Payroll Period ({summary.payroll_period_start} – {summary.payroll_period_end})
            </p>
            <p className="text-lg font-semibold text-slate-900">{formatMinutes(summary.payroll_period_minutes)}</p>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-md border border-slate-200 p-4">
        <h2 className="text-lg font-medium text-slate-900">
          {editingId ? 'Edit Time Entry' : 'Add Manual Time Entry'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div />
          <label className="text-xs text-slate-500">
            Start
            <input
              type="datetime-local"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            End
            <input
              type="datetime-local"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {formErrors.start_time && (
            <p className="col-span-2 text-sm text-red-600">{formErrors.start_time[0]}</p>
          )}
          {formErrors.end_time && <p className="col-span-2 text-sm text-red-600">{formErrors.end_time[0]}</p>}
          {formErrors.date && <p className="col-span-2 text-sm text-red-600">{formErrors.date[0]}</p>}

          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— No project —</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— No client —</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            required
            placeholder="Task"
            value={form.task}
            onChange={(e) => setForm({ ...form, task: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Work category"
            value={form.workCategory}
            onChange={(e) => setForm({ ...form, workCategory: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <textarea
            required
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <textarea
            placeholder="Reference links (one per line)"
            value={form.referenceLinks}
            onChange={(e) => setForm({ ...form, referenceLinks: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Deliverables (one per line)"
            value={form.deliverables}
            onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Entry'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-medium text-slate-900">My Time Entries</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Date</th>
              <th className="py-2">Duration</th>
              <th className="py-2">Project</th>
              <th className="py-2">Task</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100">
                <td className="py-2">{entry.date}</td>
                <td className="py-2">{entry.end_time ? formatMinutes(entry.duration_minutes) : 'Running…'}</td>
                <td className="py-2">{entry.project?.name ?? '—'}</td>
                <td className="py-2">{entry.task}</td>
                <td className="space-x-2 py-2">
                  <button
                    type="button"
                    onClick={() => startEditing(entry)}
                    disabled={!entry.end_time}
                    className="text-slate-900 underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    disabled={!entry.end_time}
                    className="text-red-600 underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No time entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
