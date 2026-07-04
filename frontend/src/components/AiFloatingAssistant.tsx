import { useEffect, useRef, useState, type SVGProps } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/useAuth'
import { askAssistant } from '../lib/aiApi'
import { ApiError } from '../lib/apiClient'
import type { AssistantAnswer, AssistantChart, AssistantTable } from '../types/ai'
import { Button } from './ui/Button'
import { TextInput } from './ui/fields'
import { TableCard, TableHead, Td, Th, Tr } from './ui/Table'

const CHART_COLOR = '#1876f2'

const EXAMPLE_QUESTIONS = [
  "What is my team's progress?",
  'Which employees are behind schedule?',
  'Which department has highest productivity?',
  'Show attendance trends.',
  "Summarize today's scrum.",
  'Which KPIs declined this week?',
]

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function AssistantChartView({ chart }: { chart: AssistantChart }) {
  const data = chart.points.map((point) => ({ name: point.label, value: point.value }))

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={CHART_COLOR} strokeWidth={2} name={chart.series_label} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
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

interface AssistantMessage {
  id: number
  question: string
  answer: AssistantAnswer | null
  error: string | null
}

function AnswerBubble({ answer }: { answer: AssistantAnswer }) {
  return (
    <div className="mr-auto max-w-[92%] space-y-3 rounded-2xl rounded-bl-sm border border-line bg-field/60 px-3 py-2 text-sm text-ink">
      <p className="font-medium">{answer.executive_summary}</p>
      <p className="text-xs text-muted">{answer.detail}</p>

      {answer.supported_examples && (
        <ul className="list-inside list-disc text-xs text-muted">
          {answer.supported_examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      )}

      {answer.recommendations.length > 0 && (
        <ul className="list-inside list-disc text-xs text-muted">
          {answer.recommendations.map((recommendation, index) => (
            <li key={index}>{recommendation}</li>
          ))}
        </ul>
      )}

      {answer.chart && <AssistantChartView chart={answer.chart} />}
      {answer.table && <AssistantTableView table={answer.table} />}
    </div>
  )
}

/**
 * Global, floating AI Assistant (Sprint 35) — separated out of AiInsightsPage
 * so it's reachable from any authenticated page. Conversation history is
 * kept in-memory for the current session only (clears on refresh); each
 * question is still classified and answered independently by the existing
 * stateless /ai-assistant/ask endpoint — no follow-up context memory.
 */
export function AiFloatingAssistant() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [isAsking, setIsAsking] = useState(false)
  const nextId = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const canUse = user?.role === 'admin' || user?.role === 'supervisor'
  if (!canUse) {
    return null
  }

  async function handleAsk(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isAsking) return

    const id = nextId.current++
    setMessages((current) => [...current, { id, question: trimmed, answer: null, error: null }])
    setQuestion('')
    setIsAsking(true)
    try {
      const answer = await askAssistant(trimmed)
      setMessages((current) => current.map((m) => (m.id === id ? { ...m, answer } : m)))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to answer that question.'
      setMessages((current) => current.map((m) => (m.id === id ? { ...m, error: message } : m)))
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {isOpen ? <CloseIcon className="size-6" /> : <ChatIcon className="size-6" />}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="AI Assistant"
          className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">AI Assistant</p>
            <p className="text-xs text-muted">Answers computed locally from stored records only.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={isAsking}
                    onClick={() => void handleAsk(example)}
                    className="rounded-full border border-line bg-field px-3 py-1 text-xs font-medium text-ink hover:bg-white"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white">
                  {message.question}
                </div>

                {message.error && (
                  <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-red-50 px-3 py-2 text-sm text-red-700">
                    {message.error}
                  </div>
                )}

                {message.answer && <AnswerBubble answer={message.answer} />}

                {!message.answer && !message.error && (
                  <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-field px-3 py-2 text-sm text-muted">
                    Thinking…
                  </div>
                )}
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleAsk(question)
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <TextInput
              type="text"
              placeholder="Ask a question…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isAsking || !question.trim()}>
              Send
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
