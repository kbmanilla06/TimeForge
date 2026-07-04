import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../lib/apiClient'
import { addScrumComment, listTeamScrums } from '../lib/scrumApi'
import { groupScrumsByEmployee } from '../lib/scrumGrouping'
import type { DailyScrum } from '../types/scrum'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

function ScrumColumn({ label, tone = 'default', children }: { label: string; tone?: 'default' | 'danger'; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-sm ${tone === 'danger' ? 'font-medium text-red-600' : 'text-ink'}`}>{children}</p>
    </div>
  )
}

export function TeamScrumPage() {
  const [scrums, setScrums] = useState<DailyScrum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set())

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

  const groups = useMemo(() => groupScrumsByEmployee(scrums), [scrums])

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader title="Team Scrum" subtitle="Your team's daily updates and blockers." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

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
                    {group.scrums.length} entr{group.scrums.length === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary">{isExpanded ? 'Collapse' : 'Expand'}</span>
              </button>

              {isExpanded && (
                <div className="space-y-4 border-t border-line px-5 py-4">
                  {group.scrums.map((scrum) => (
                    <div key={scrum.id} className="rounded-xl border border-line bg-field/40 p-4">
                      <p className="font-medium text-ink">{scrum.date}</p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <ScrumColumn label="Yesterday">{scrum.previous_work}</ScrumColumn>
                        <ScrumColumn label="Today">{scrum.planned_work}</ScrumColumn>
                        <ScrumColumn label="Blockers" tone={scrum.blockers ? 'danger' : 'default'}>
                          {scrum.blockers ?? 'No blockers reported.'}
                        </ScrumColumn>
                      </div>

                      {scrum.notes && (
                        <div className="mt-3">
                          <ScrumColumn label="Notes">{scrum.notes}</ScrumColumn>
                        </div>
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
                </div>
              )}
            </div>
          )
        })}

        {groups.length === 0 && <EmptyState>No scrum entries yet.</EmptyState>}
      </div>
    </main>
  )
}
