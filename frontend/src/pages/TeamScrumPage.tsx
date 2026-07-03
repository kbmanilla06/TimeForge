import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { addScrumComment, listTeamScrums } from '../lib/scrumApi'
import type { DailyScrum } from '../types/scrum'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

export function TeamScrumPage() {
  const [scrums, setScrums] = useState<DailyScrum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      setScrums(await listTeamScrums())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load team scrum entries.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleComment(scrum: DailyScrum) {
    const comment = drafts[scrum.id]?.trim()
    if (!comment) return

    setError(null)
    try {
      await addScrumComment(scrum.id, { comment })
      setDrafts({ ...drafts, [scrum.id]: '' })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to add comment.')
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
      <PageHeader title="Team Scrum" subtitle="Your team's daily updates and blockers." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        {scrums.map((scrum) => (
          <div key={scrum.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="font-medium text-ink">
              {scrum.user?.name ?? `User #${scrum.user_id}`} — {scrum.date}
            </p>
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Previous:</span> {scrum.previous_work}
            </p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-medium">Planned:</span> {scrum.planned_work}
            </p>
            {scrum.blockers && (
              <p className="mt-1 text-sm font-medium text-red-600">Blockers: {scrum.blockers}</p>
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

            <div className="mt-4 flex flex-wrap gap-2">
              <TextInput
                type="text"
                placeholder="Add a comment"
                value={drafts[scrum.id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [scrum.id]: e.target.value })}
                className="flex-1"
              />
              <Button size="sm" className="h-10" onClick={() => handleComment(scrum)}>
                Comment
              </Button>
            </div>
          </div>
        ))}

        {scrums.length === 0 && <EmptyState>No scrum entries yet.</EmptyState>}
      </div>
    </main>
  )
}
