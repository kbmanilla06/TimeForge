import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/useAuth'
import { listDepartments } from '../lib/adminApi'
import { askAssistant, generateAiOutput, listAiOutputs } from '../lib/aiApi'
import { ApiError } from '../lib/apiClient'
import { listTeamMembers } from '../lib/kpiApi'
import type { Department } from '../types/admin'
import type { AiOutput, AiOutputQuery, AiOutputType, AssistantAnswer, AssistantChart, AssistantTable } from '../types/ai'
import type { TeamMember } from '../types/kpi'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { SectionCard } from '../components/ui/Card'
import { Select, TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

const CHART_COLOR = '#1876f2'

const EXAMPLE_QUESTIONS = [
  "What is my team's progress?",
  'Which employees are behind schedule?',
  'Which department has highest productivity?',
  'Show attendance trends.',
  "Summarize today's scrum.",
  'Which KPIs declined this week?',
]

function AssistantChartView({ chart }: { chart: AssistantChart }) {
  const data = chart.points.map((point) => ({ name: point.label, value: point.value }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={CHART_COLOR} strokeWidth={2} name={chart.series_label} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill={CHART_COLOR} name={chart.series_label} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function AssistantTableView({ table }: { table: AssistantTable }) {
  return (
    <TableCard>
      <TableHead>
        {table.columns.map((column) => (
          <Th key={column}>{column}</Th>
        ))}
      </TableHead>
      <tbody>
        {table.rows.map((row, index) => (
          <Tr key={index}>
            {row.map((cell, cellIndex) => (
              <Td key={cellIndex} className={cellIndex === 0 ? 'font-medium text-ink' : 'text-muted'}>
                {cell}
              </Td>
            ))}
          </Tr>
        ))}
        {table.rows.length === 0 && (
          <tr>
            <td colSpan={table.columns.length} className="px-4 py-8 text-center text-muted">
              No data for this question.
            </td>
          </tr>
        )}
      </tbody>
    </TableCard>
  )
}

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
  const [mode, setMode] = useState<'reports' | 'assistant'>('reports')
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

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const [assistantError, setAssistantError] = useState<string | null>(null)

  const canPickSubject = user?.role === 'supervisor' || user?.role === 'admin'
  const canUseAssistant = user?.role === 'admin' || user?.role === 'supervisor'

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

  async function handleAsk(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    setIsAsking(true)
    setAssistantError(null)
    try {
      setAnswer(await askAssistant(trimmed))
    } catch (err) {
      setAssistantError(err instanceof ApiError ? err.message : 'Unable to answer that question.')
    } finally {
      setIsAsking(false)
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
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="AI Insights"
        subtitle="On-demand summaries derived only from stored TimeForge records. Every output is labeled AI-generated; regenerating keeps previous versions."
      />

      {canUseAssistant && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('reports')}
            className={
              mode === 'reports'
                ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-field'
            }
          >
            Reports
          </button>
          <button
            type="button"
            onClick={() => setMode('assistant')}
            className={
              mode === 'assistant'
                ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-field'
            }
          >
            Ask AI
          </button>
        </div>
      )}

      {mode === 'assistant' && canUseAssistant && (
        <>
          <SectionCard title="Ask AI Assistant">
            <p className="text-sm text-muted">
              Ask a question about your {user?.role === 'admin' ? 'organization' : 'team'}. Answers are computed
              locally from stored TimeForge records only — no external AI service is used.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TextInput
                type="text"
                placeholder="e.g. What is my team's progress?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => void handleAsk(question)} disabled={isAsking || !question.trim()}>
                {isAsking ? 'Asking…' : 'Ask'}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuestion(example)
                    void handleAsk(example)
                  }}
                  className="rounded-full border border-line bg-field px-3 py-1 text-xs font-medium text-ink hover:bg-white"
                >
                  {example}
                </button>
              ))}
            </div>
          </SectionCard>

          {assistantError && (
            <Alert tone="error" className="mt-4">
              {assistantError}
            </Alert>
          )}
          {isAsking && <LoadingState label="Thinking…" />}

          {answer && !isAsking && (
            <section className="mt-6 space-y-4">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-white">AI-generated</span>
                  <span className="text-muted">{new Date(answer.generated_at).toLocaleString()}</span>
                </div>
                <p className="mt-3 font-medium text-ink">{answer.executive_summary}</p>
                <p className="mt-2 text-sm text-muted">{answer.detail}</p>

                {answer.supported_examples && (
                  <ul className="mt-3 list-inside list-disc text-sm text-muted">
                    {answer.supported_examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                )}

                {answer.recommendations.length > 0 && (
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-sm font-medium text-ink">Recommendations</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted">
                      {answer.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {answer.chart && (
                <SectionCard title="Chart">
                  <AssistantChartView chart={answer.chart} />
                </SectionCard>
              )}

              {answer.table && <AssistantTableView table={answer.table} />}
            </section>
          )}
        </>
      )}

      {mode === 'reports' && (
        <>
      <div className="flex flex-wrap gap-2 border-b border-line pb-4">
        {visibleTabs.map((tabOption) => (
          <button
            key={tabOption}
            type="button"
            onClick={() => setTab(tabOption)}
            className={
              tab === tabOption
                ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-field'
            }
          >
            {TAB_LABELS[tabOption]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {subjectShape === 'user' && canPickSubject && (
          <label className="text-sm font-medium text-ink">
            Employee
            <Select
              value={subjectUserId ?? ''}
              onChange={(e) => setSubjectUserId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block"
            >
              {subjectOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        {subjectShape === 'user' && !canPickSubject && (
          <p className="py-2 text-sm text-muted">Subject: yourself</p>
        )}
        {subjectShape === 'department' && user?.role === 'admin' && (
          <label className="text-sm font-medium text-ink">
            Department
            <Select
              value={subjectDepartmentId ?? ''}
              onChange={(e) =>
                setSubjectDepartmentId(e.target.value ? Number(e.target.value) : null)
              }
              className="mt-1 block"
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        {subjectShape === 'department' && user?.role === 'supervisor' && (
          <p className="py-2 text-sm text-muted">Subject: your department</p>
        )}
        {subjectShape === 'organization' && (
          <p className="py-2 text-sm text-muted">Subject: entire organization</p>
        )}
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Button onClick={() => void handleGenerate()} disabled={isGenerating || !query}>
          {isGenerating ? 'Generating…' : latest ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      {isLoading && <LoadingState />}

      {!isLoading && !latest && !error && (
        <p className="mt-6 text-sm text-muted">Nothing generated yet for this selection — click Generate.</p>
      )}

      {latest && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-white">AI-generated</span>
            <span className="text-muted">
              provider: {latest.provider} · {new Date(latest.generated_at).toLocaleString()} · by{' '}
              {latest.generated_by_name}
            </span>
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm text-ink">{latest.content}</div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-ink">Previous generations</h2>
          <div className="mt-2 space-y-2">
            {history.map((output) => (
              <details key={output.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <summary className="cursor-pointer text-sm text-muted">
                  AI-generated on {new Date(output.generated_at).toLocaleString()} by{' '}
                  {output.generated_by_name}
                </summary>
                <div className="mt-2 whitespace-pre-wrap text-sm text-ink">{output.content}</div>
              </details>
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </main>
  )
}
