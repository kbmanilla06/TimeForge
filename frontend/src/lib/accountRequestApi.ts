import type { AccountRequest, AccountRequestStatus } from '../types/accountRequest'
import { apiFetch } from './apiClient'

export interface ListAccountRequestsParams {
  search?: string
  status?: AccountRequestStatus
}

export function listAccountRequests(params: ListAccountRequestsParams = {}): Promise<AccountRequest[]> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  const suffix = query.toString() ? `?${query.toString()}` : ''

  return apiFetch<AccountRequest[]>(`/admin/account-requests${suffix}`)
}

export function approveAccountRequest(id: number): Promise<AccountRequest> {
  return apiFetch<AccountRequest>(`/admin/account-requests/${id}/approve`, { method: 'PATCH' })
}

export function rejectAccountRequest(id: number, remarks?: string): Promise<AccountRequest> {
  return apiFetch<AccountRequest>(`/admin/account-requests/${id}/reject`, {
    method: 'PATCH',
    body: remarks ? { remarks } : {},
  })
}
