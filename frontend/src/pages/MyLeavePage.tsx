import { useEffect, useState, type FormEvent } from 'react'
import { listMyLeaveRequests, submitLeaveRequest } from '../lib/leaveRequestApi'
import { ApiError } from '../lib/apiClient'
import type { LeaveRequest, LeaveType } from '../types/leaveRequest'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Field, Select, Textarea, TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/Badge'
import { LoadingState } from '../components/ui/states'
import { SectionCard } from '../components/ui/Card'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick' },
  { value: 'other', label: 'Other' },
]

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

export function MyLeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('vacation')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    void loadLeaveRequests()
  }, [])

  async function loadLeaveRequests() {
    setIsLoading(true)
    setLoadError(null)
    try {
      setLeaveRequests(await listMyLeaveRequests())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Unable to load leave requests.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await submitLeaveRequest({
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        reason: reason || null,
      })
      setStartDate('')
      setEndDate('')
      setLeaveType('vacation')
      setReason('')
      await loadLeaveRequests()
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? (err.errors?.end_date?.[0] ?? err.errors?.leave_type?.[0] ?? err.message)
          : 'Unable to submit leave request.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader title="My Leave" subtitle="Submit a leave request and track its approval status." />

      <SectionCard title="Request Leave">
        {submitError && (
          <Alert tone="error" className="mb-4">
            {submitError}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start Date" htmlFor="leave-start-date">
              <TextInput
                id="leave-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End Date" htmlFor="leave-end-date">
              <TextInput
                id="leave-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Leave Type" htmlFor="leave-type">
            <Select id="leave-type" value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
              {LEAVE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason (optional)" htmlFor="leave-reason">
            <Textarea id="leave-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            Submit Request
          </Button>
        </form>
      </SectionCard>

      {loadError && (
        <Alert tone="error" className="mb-4">
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Dates</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Decision</Th>
          </TableHead>
          <tbody>
            {leaveRequests.map((leaveRequest) => (
              <Tr key={leaveRequest.id}>
                <Td>
                  {formatDate(leaveRequest.start_date)} – {formatDate(leaveRequest.end_date)}
                </Td>
                <Td className="capitalize text-muted">{leaveRequest.leave_type}</Td>
                <Td>
                  <StatusBadge status={leaveRequest.status} />
                </Td>
                <Td className="text-xs text-muted">
                  {leaveRequest.status === 'rejected' && leaveRequest.rejection_reason ? (
                    <>&ldquo;{leaveRequest.rejection_reason}&rdquo;</>
                  ) : leaveRequest.reviewer ? (
                    `By ${leaveRequest.reviewer.name}`
                  ) : (
                    '—'
                  )}
                </Td>
              </Tr>
            ))}
            {leaveRequests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No leave requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
