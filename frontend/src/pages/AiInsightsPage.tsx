import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listDepartments } from '../lib/adminApi'
import { generateAiOutput, listAiOutputs } from '../lib/aiApi'
import { ApiError } from '../lib/apiClient'
import { listTeamMembers } from '../lib/kpiApi'
import type { Department } from '../types/admin'
import type { AiOutput, AiOutputQuery, AiOutputType } from '../types/ai'
import type { TeamMember } from '../types/kpi'

const TAB_LABELS: Record<AiOutputType, string> = {
  daily_work_summary: 'Daily Summary',
  weekly_productivity_report: 'Weekly Report',
  productivity_trend_analysis: 'Productivity Trend',
  recurring_blockers: 'Recurring Blockers',
  kpi_performance_analysis: 'KPI Analysis',
  supervisor_recommendations: 'Recommendations',
  payroll_validation: 'Payroll Validation',
}

const SUBJECT_SHAPES: Record<AiOutputType, 'user' | 'department' | 'organization'> = {
  daily_work_summary: 'user',
  weekly_productivity_report: 'user',
  productivity_trend_analysis: 'user',
  recurring_blockers: 'department',
  kpi_performance_analysis: 'department',
  supervisor_recommendations: 'department',
  payroll_validation: 'organization',
}

const USER_TABS: AiOutputType[] = [
  'daily_work_summary',
  'weekly_productivity_report',
  'productivity_trend_analysis',
]

const DEPARTMENT_TABS: AiOutputType[] = [
  'recurring_blockers',
  'kpi_performance_analysis',
  'supervisor_recommendations',
]

function todayLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function AiInsightsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<AiOutputType>(() =>
    user?.role === 'hr_finance' ? 'payroll_validation' : 'daily_work_summary',
  )
  const [date, setDate] = useState(todayLocal())
  const [subjectUserId, setSubjectUserId] = useState<number | null>(user?.id ?? null)
  const [subjectDepartmentId, setSubjectDepartmentId] = useState<number | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [outputs, setOutputs] = useState<AiOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPickSubject = user?.role === 'supervisor' || user?.role === 'admin'

  useEffect(() => {
    if (!user) {
      return
    }
    if (user.role === 'supervisor' || user.role === 'admin') {
      listTeamMembers()
        .then(setMembers)
        .catch(() => setMembers([]))
    }
    if (user.role === 'admin') {
      listDepartments()
        .then((loaded) => {
          setDepartments(loaded)
          setSubjectDepartmentId((current) => current ?? loaded[0]?.id ?? null)
        })
        .catch(() => setDepartments([]))
    }
  }, [user])

  const query = useMemo<AiOutputQuery | null>(() => {
    if (!user || !date) {
      return null
    }

    const shape = SUBJECT_SHAPES[tab]

    if (shape === 'organization') {
      return { type: tab, date }
    }

    if (shape === 'department') {
      const departmentId = user.role === 'admin' ? subjectDepartmentId : user.department_id
      return departmentId ? { type: tab, date, department_id: departmentId } : null
    }

    const userId = canPickSubject ? subjectUserId : user.id
    return userId ? { type: tab, date, user_id: userId } : null
  }, [user, tab, date, subjectUserId, subjectDepartmentId, canPickSubject])

  useEffect(() => {
    if (!query) {
      setOutputs([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    listAiOutputs(query)
      .then((loaded) => {
        if (!cancelled) {
          setOutputs(loaded)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOutputs([])
          setError(err instanceof ApiError ? err.message : 'Unable to load AI outputs.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query])

  async function handleGenerate() {
    if (!query) {
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
      const created = await generateAiOutput(query)
      setOutputs((current) => [created, ...current])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to generate the AI output.')
    } finally {
      setIsGenerating(false)
    }
  }

  const visibleTabs: AiOutputType[] =
    user?.role === 'hr_finance'
      ? ['payroll_validation']
      : user?.role === 'admin'
        ? [...USER_TABS, ...DEPARTMENT_TABS, 'payroll_validation']
        : user?.role === 'supervisor' && user.department_id !== null
          ? [...USER_TABS, ...DEPARTMENT_TABS]
          : USER_TABS

  const subjectShape = SUBJECT_SHAPES[tab]

  const subjectOptions: TeamMember[] =
    members.length > 0
      ? members
      : user
        ? [{ id: user.id, name: user.name, department_id: user.department_id }]
        : []

  const latest = outputs[0] ?? null
  const history = outputs.slice(1)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">AI Insights</h1>
      <p className="mt-1 text-sm text-slate-500">
        On-demand summaries derived only from stored TimeForge records. Every output is labeled
        AI-generated; regenerating keeps previous versions.
      </p>

      <div className="mt-6 flex gap-2">
        {visibleTabs.map((tabOption) => (
          <button
            key={tabOption}
            type="button"
            onClick={() => setTab(tabOption)}
            className={
              tab === tabOption
                ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                : 'rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700'
            }
          >
            {TAB_LABELS[tabOption]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        {subjectShape === 'user' && canPickSubject && (
          <label className="text-sm text-slate-700">
            Employee
            <select
              value={subjectUserId ?? ''}
              onChange={(e) => setSubjectUserId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {subjectOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {subjectShape === 'user' && !canPickSubject && (
          <p className="py-2 text-sm text-slate-500">Subject: yourself</p>
        )}
        {subjectShape === 'department' && user?.role === 'admin' && (
          <label className="text-sm text-slate-700">
            Department
            <select
              value={subjectDepartmentId ?? ''}
              onChange={(e) =>
                setSubjectDepartmentId(e.target.value ? Number(e.target.value) : null)
              }
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {subjectShape === 'department' && user?.role === 'supervisor' && (
          <p className="py-2 text-sm text-slate-500">Subject: your department</p>
        )}
        {subjectShape === 'organization' && (
          <p className="py-2 text-sm text-slate-500">Subject: entire organization</p>
        )}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !query}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : latest ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

      {!isLoading && !latest && !error && (
        <p className="mt-6 text-sm text-slate-400">
          Nothing generated yet for this selection — click Generate.
        </p>
      )}

      {latest && (
        <section className="mt-6 rounded-md border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-medium text-white">
              AI-generated
            </span>
            <span className="text-slate-500">
              provider: {latest.provider} · {new Date(latest.generated_at).toLocaleString()} · by{' '}
              {latest.generated_by_name}
            </span>
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{latest.content}</div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-medium text-slate-900">Previous generations</h2>
          <div className="mt-2 space-y-2">
            {history.map((output) => (
              <details key={output.id} className="rounded-md border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm text-slate-600">
                  AI-generated on {new Date(output.generated_at).toLocaleString()} by{' '}
                  {output.generated_by_name}
                </summary>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {output.content}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
