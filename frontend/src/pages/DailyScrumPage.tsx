import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../lib/apiClient'
import { listMyScrums, submitScrum } from '../lib/scrumApi'
import { isScrumLocked, type DailyScrum } from '../types/scrum'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { SectionCard } from '../components/ui/Card'
import { Textarea, TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

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
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="Daily Scrum" subtitle="What you did, what's next, and what's blocking you." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <SectionCard
        title={todaysScrum ? 'Edit Entry' : 'Submit Entry'}
        actions={
          <TextInput
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        }
      >
        {locked && (
          <Alert tone="info" className="mb-3">
            This entry has been reviewed and can no longer be edited.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            required
            placeholder="Work completed the previous working day"
            value={previousWork}
            onChange={(e) => setPreviousWork(e.target.value)}
            disabled={locked}
          />
          <Textarea
            required
            placeholder="Planned activities for today"
            value={plannedWork}
            onChange={(e) => setPlannedWork(e.target.value)}
            disabled={locked}
          />
          <Textarea
            placeholder="Blockers or issues (optional)"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            disabled={locked}
          />
          <Textarea
            placeholder="Additional notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={locked}
          />
          <Button type="submit" disabled={isSaving || locked}>
            {isSaving ? 'Saving…' : todaysScrum ? 'Save Changes' : 'Submit'}
          </Button>
        </form>
      </SectionCard>

      <section className="mt-6 space-y-3">
        <h2 className="text-base font-semibold text-ink">My Past Entries</h2>
        {scrums.map((scrum) => (
          <div key={scrum.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="font-medium text-ink">{scrum.date}</p>
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Previous:</span> {scrum.previous_work}
            </p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-medium">Planned:</span> {scrum.planned_work}
            </p>
            {scrum.blockers && (
              <p className="mt-1 text-sm text-red-600">
                <span className="font-medium">Blockers:</span> {scrum.blockers}
              </p>
            )}
            {scrum.notes && (
              <p className="mt-1 text-sm text-muted">
                <span className="font-medium">Notes:</span> {scrum.notes}
              </p>
            )}
            {(scrum.comments ?? []).length > 0 && (
              <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                {(scrum.comments ?? []).map((comment) => (
                  <p key={comment.id} className="text-muted">
                    <span className="font-medium text-ink">{comment.author?.name ?? 'Reviewer'}:</span>{' '}
                    {comment.comment}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
        {scrums.length === 0 && <EmptyState>No entries yet.</EmptyState>}
      </section>
    </main>
  )
}
