import type { PayrollSummaryRow } from '../types/payroll'
import { apiFetch, apiFetchBlob } from './apiClient'

function dateQuery(date?: string): string {
  return date ? `?date=${encodeURIComponent(date)}` : ''
}

export function getPayrollSummary(date?: string): Promise<PayrollSummaryRow[]> {
  return apiFetch<PayrollSummaryRow[]>(`/payroll${dateQuery(date)}`)
}

export function exportPayrollPdf(date?: string): Promise<Blob> {
  return apiFetchBlob(`/payroll/export/pdf${dateQuery(date)}`)
}

export function exportPayrollExcel(date?: string): Promise<Blob> {
  return apiFetchBlob(`/payroll/export/excel${dateQuery(date)}`)
}
