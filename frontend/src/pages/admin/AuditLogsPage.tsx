import { useEffect, useState } from 'react'
import { listAuditLogs } from '../../lib/auditLogApi'
import { ApiError } from '../../lib/apiClient'
import type { AuditLog } from '../../types/auditLog'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

function describeSubject(log: AuditLog): string {
  if (!log.subject_type || !log.subject_id) return '—'
  const shortType = log.subject_type.split('\\').pop() ?? log.subject_type
  return `${shortType} #${log.subject_id}`
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listAuditLogs({
      action: action || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
    })
      .then((result) => {
        if (!cancelled) {
          setLogs(result.data)
          setLastPage(result.last_page)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load audit logs.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [action, dateFrom, dateTo, page])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Audit Log"
        subtitle="A read-only record of sensitive actions across the system."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <TextInput
          type="text"
          placeholder="Filter by action, e.g. user.activated"
          value={action}
          onChange={(e) => {
            setPage(1)
            setAction(e.target.value)
          }}
          className="max-w-xs flex-1"
          aria-label="Filter by action"
        />
        <TextInput
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setPage(1)
            setDateFrom(e.target.value)
          }}
          className="w-auto"
          aria-label="From date"
        />
        <TextInput
          type="date"
          value={dateTo}
          onChange={(e) => {
            setPage(1)
            setDateTo(e.target.value)
          }}
          className="w-auto"
          aria-label="To date"
        />
      </div>

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <TableCard>
            <TableHead>
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Subject</Th>
              <Th>Metadata</Th>
            </TableHead>
            <tbody>
              {logs.map((log) => (
                <Tr key={log.id}>
                  <Td className="text-muted">{formatDate(log.created_at)}</Td>
                  <Td>{log.actor ? log.actor.name : '—'}</Td>
                  <Td className="font-mono text-xs">{log.action}</Td>
                  <Td className="text-muted">{describeSubject(log)}</Td>
                  <Td className="max-w-xs">
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <pre className="whitespace-pre-wrap break-all text-xs text-muted">
                        {JSON.stringify(log.metadata)}
                      </pre>
                    ) : (
                      '—'
                    )}
                  </Td>
                </Tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No audit log entries match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </TableCard>

          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {page} of {lastPage}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
