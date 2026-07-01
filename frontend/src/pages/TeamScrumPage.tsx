import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { addScrumComment, listTeamScrums } from '../lib/scrumApi'
import type { DailyScrum } from '../types/scrum'

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
    return <p className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Team Scrum</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {scrums.map((scrum) => (
          <div key={scrum.id} className="rounded-md border border-slate-200 p-4">
            <p className="font-medium text-slate-900">
              {scrum.user?.name ?? `User #${scrum.user_id}`} — {scrum.date}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium">Previous:</span> {scrum.previous_work}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium">Planned:</span> {scrum.planned_work}
            </p>
            {scrum.blockers && (
              <p className="text-sm font-medium text-red-600">Blockers: {scrum.blockers}</p>
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

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Add a comment"
                value={drafts[scrum.id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [scrum.id]: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleComment(scrum)}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Comment
              </button>
            </div>
          </div>
        ))}

        {scrums.length === 0 && <p className="text-slate-400">No scrum entries yet.</p>}
      </div>
    </main>
  )
}
