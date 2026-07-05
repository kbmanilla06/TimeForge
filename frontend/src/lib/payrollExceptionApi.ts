import type { PayrollExceptionRow } from '../types/payrollException'
import { apiFetch, apiFetchBlob } from './apiClient'

function dateQuery(date?: string): string {
  return date ? `?date=${encodeURIComponent(date)}` : ''
}

export function getPayrollExceptions(date?: string): Promise<PayrollExceptionRow[]> {
  return apiFetch<PayrollExceptionRow[]>(`/payroll/exceptions${dateQuery(date)}`)
}

export function exportPayrollExceptionsPdf(date?: string): Promise<Blob> {
  return apiFetchBlob(`/payroll/exceptions/export/pdf${dateQuery(date)}`)
}

export function exportPayrollExceptionsExcel(date?: string): Promise<Blob> {
  return apiFetchBlob(`/payroll/exceptions/export/excel${dateQuery(date)}`)
}
