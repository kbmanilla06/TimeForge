import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../lib/apiClient'
import { listMyScrums, submitScrum } from '../lib/scrumApi'
import { isScrumLocked, type DailyScrum } from '../types/scrum'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DailyScrumPage() {
  const [scrums, setScrums] = useState<DailyScrum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [date, setDate] = useState(today())
  const [previousWork, setPreviousWork] = useState('')
  const [plannedWork, setPlannedWork] = useState('')
  const [blockers, setBlockers] = useState('')
  const [notes, setNotes] = useState('')

  const todaysScrum = scrums.find((scrum) => scrum.date === date) ?? null
  const locked = todaysScrum ? isScrumLocked(todaysScrum) : false

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const existing = scrums.find((scrum) => scrum.date === date)
    setPreviousWork(existing?.previous_work ?? '')
    setPlannedWork(existing?.planned_work ?? '')
    setBlockers(existing?.blockers ?? '')
    setNotes(existing?.notes ?? '')
  }, [date, scrums])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      setScrums(await listMyScrums())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load your daily scrum entries.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      await submitScrum({
        date,
        previous_work: previousWork,
        planned_work: plannedWork,
        blockers: blockers || null,
        notes: notes || null,
      })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save your daily scrum entry.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="mx-auto max-w-2xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Daily Scrum</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 rounded-md border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">
            {todaysScrum ? 'Edit Entry' : 'Submit Entry'}
          </h2>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {locked && (
          <p className="mt-2 text-sm text-slate-500">
            This entry has been reviewed and can no longer be edited.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <textarea
            required
            placeholder="Work completed the previous working day"
            value={previousWork}
            onChange={(e) => setPreviousWork(e.target.value)}
            disabled={locked}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
          <textarea
            required
            placeholder="Planned activities for today"
            value={plannedWork}
            onChange={(e) => setPlannedWork(e.target.value)}
            disabled={locked}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
          <textarea
            placeholder="Blockers or issues (optional)"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            disabled={locked}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
          <textarea
            placeholder="Additional notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={locked}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSaving || locked}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : todaysScrum ? 'Save Changes' : 'Submit'}
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">My Past Entries</h2>
        {scrums.map((scrum) => (
          <div key={scrum.id} className="rounded-md border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{scrum.date}</p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium">Previous:</span> {scrum.previous_work}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium">Planned:</span> {scrum.planned_work}
            </p>
            {scrum.blockers && (
              <p className="text-sm text-red-600">
                <span className="font-medium">Blockers:</span> {scrum.blockers}
              </p>
            )}
            {scrum.notes && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">Notes:</span> {scrum.notes}
              </p>
            )}
            {(scrum.comments ?? []).length > 0 && (
              <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-sm">
                {(scrum.comments ?? []).map((comment) => (
                  <p key={comment.id} className="text-slate-600">
                    <span className="font-medium">{comment.author?.name ?? 'Reviewer'}:</span> {comment.comment}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
        {scrums.length === 0 && <p className="text-slate-400">No entries yet.</p>}
      </section>
    </main>
  )
}
