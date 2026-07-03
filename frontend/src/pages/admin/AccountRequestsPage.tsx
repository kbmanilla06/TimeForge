import { useEffect, useState } from 'react'
import { approveAccountRequest, listAccountRequests, rejectAccountRequest } from '../../lib/accountRequestApi'
import { ApiError } from '../../lib/apiClient'
import type { AccountRequest, AccountRequestStatus } from '../../types/accountRequest'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Select, Textarea, TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

const STATUS_OPTIONS: { value: AccountRequestStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function AccountRequestsPage() {
  const [requests, setRequests] = useState<AccountRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AccountRequestStatus | ''>('')
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listAccountRequests({ search: search || undefined, status: status || undefined })
      .then((data) => {
        if (!cancelled) setRequests(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load account requests.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search, status, refreshKey])

  async function handleApprove(request: AccountRequest) {
    setError(null)
    setActioningId(request.id)
    try {
      await approveAccountRequest(request.id)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to approve this account request.')
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(request: AccountRequest) {
    setError(null)
    setActioningId(request.id)
    try {
      await rejectAccountRequest(request.id, remarks[request.id] || undefined)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reject this account request.')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Account Approvals"
        subtitle="Review, approve, or reject pending self-registrations."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <TextInput
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs flex-1"
          aria-label="Search applicants"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountRequestStatus | '')}
          className="w-auto"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Applicant</Th>
            <Th>Department</Th>
            <Th>Position</Th>
            <Th>Submitted</Th>
            <Th>Status</Th>
            <Th>Decision</Th>
          </TableHead>
          <tbody>
            {requests.map((request) => (
              <Tr key={request.id}>
                <Td>
                  <p className="font-medium text-ink">{request.user.name}</p>
                  <p className="text-muted">{request.user.email}</p>
                  {(request.user.employee_id || request.user.contact_number) && (
                    <p className="mt-0.5 text-xs text-muted">
                      {[request.user.employee_id, request.user.contact_number].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </Td>
                <Td className="text-muted">{request.user.department?.name ?? '—'}</Td>
                <Td className="text-muted">{request.user.position ?? '—'}</Td>
                <Td className="text-muted">{formatDate(request.created_at)}</Td>
                <Td>
                  <StatusBadge status={request.status} />
                </Td>
                <Td className="min-w-64">
                  {request.status === 'submitted' ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Rejection remarks (optional)"
                        value={remarks[request.id] ?? ''}
                        onChange={(e) => setRemarks({ ...remarks, [request.id]: e.target.value })}
                        className="h-16 text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={actioningId === request.id}
                          onClick={() => handleApprove(request)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actioningId === request.id}
                          onClick={() => handleReject(request)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted">
                      <p>
                        By {request.reviewer?.name ?? '—'} on {formatDate(request.reviewed_at)}
                      </p>
                      {request.rejection_reason && (
                        <p className="mt-1 text-ink">&ldquo;{request.rejection_reason}&rdquo;</p>
                      )}
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No account requests match this view.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
