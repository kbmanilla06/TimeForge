import { useEffect, useState } from 'react'
import { approveLeaveRequest, listTeamLeaveRequests, rejectLeaveRequest } from '../lib/leaveRequestApi'
import { ApiError } from '../lib/apiClient'
import type { LeaveRequest } from '../types/leaveRequest'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/Badge'
import { LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

export function TeamLeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({})
  const [actioningId, setActioningId] = useState<number | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      setLeaveRequests(await listTeamLeaveRequests())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load leave requests.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove(leaveRequest: LeaveRequest) {
    setError(null)
    setActioningId(leaveRequest.id)
    try {
      await approveLeaveRequest(leaveRequest.id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to approve this leave request.')
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(leaveRequest: LeaveRequest) {
    setError(null)
    setActioningId(leaveRequest.id)
    try {
      await rejectLeaveRequest(leaveRequest.id, { rejection_reason: rejectionReasons[leaveRequest.id] || undefined })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reject this leave request.')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader title="Team Leave" subtitle="Review, approve, or reject your team's leave requests." />

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
            <Th>Employee</Th>
            <Th>Dates</Th>
            <Th>Type</Th>
            <Th>Reason</Th>
            <Th>Status</Th>
            <Th>Decision</Th>
          </TableHead>
          <tbody>
            {leaveRequests.map((leaveRequest) => (
              <Tr key={leaveRequest.id}>
                <Td className="font-medium text-ink">{leaveRequest.user?.name ?? '—'}</Td>
                <Td className="text-muted">
                  {formatDate(leaveRequest.start_date)} – {formatDate(leaveRequest.end_date)}
                </Td>
                <Td className="capitalize text-muted">{leaveRequest.leave_type}</Td>
                <Td className="text-muted">{leaveRequest.reason ?? '—'}</Td>
                <Td>
                  <StatusBadge status={leaveRequest.status} />
                </Td>
                <Td className="min-w-64">
                  {leaveRequest.status === 'pending' ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Rejection reason (optional)"
                        value={rejectionReasons[leaveRequest.id] ?? ''}
                        onChange={(e) =>
                          setRejectionReasons({ ...rejectionReasons, [leaveRequest.id]: e.target.value })
                        }
                        className="h-16 text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={actioningId === leaveRequest.id}
                          onClick={() => handleApprove(leaveRequest)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actioningId === leaveRequest.id}
                          onClick={() => handleReject(leaveRequest)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted">
                      <p>By {leaveRequest.reviewer?.name ?? '—'}</p>
                      {leaveRequest.rejection_reason && (
                        <p className="mt-1 text-ink">&ldquo;{leaveRequest.rejection_reason}&rdquo;</p>
                      )}
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
            {leaveRequests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No leave requests to review.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
