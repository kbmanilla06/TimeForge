import type { PayrollSummaryRow } from '../types/payroll'
import { apiFetch } from './apiClient'

export function getPayrollSummary(date?: string): Promise<PayrollSummaryRow[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiFetch<PayrollSummaryRow[]>(`/payroll${query}`)
}
