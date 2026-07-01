export interface ScrumComment {
  id: number
  daily_scrum_id: number
  author_id: number
  comment: string
  author?: { id: number; name: string } | null
  created_at: string
}

export interface DailyScrum {
  id: number
  user_id: number
  date: string
  previous_work: string
  planned_work: string
  blockers: string | null
  notes: string | null
  comments?: ScrumComment[]
  user?: { id: number; name: string } | null
}

export interface SubmitScrumPayload {
  date: string
  previous_work: string
  planned_work: string
  blockers?: string | null
  notes?: string | null
}

export interface AddScrumCommentPayload {
  comment: string
}

export function isScrumLocked(scrum: DailyScrum): boolean {
  return (scrum.comments ?? []).length > 0
}
