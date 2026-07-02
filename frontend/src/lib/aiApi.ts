import type { AiOutput, AiOutputListResponse, AiOutputQuery } from '../types/ai'
import { apiFetch } from './apiClient'

function toQueryString(query: AiOutputQuery): string {
  const params = new URLSearchParams({ type: query.type, date: query.date })
  if (query.user_id != null) {
    params.set('user_id', String(query.user_id))
  }
  if (query.department_id != null) {
    params.set('department_id', String(query.department_id))
  }
  return params.toString()
}

export function listAiOutputs(query: AiOutputQuery): Promise<AiOutput[]> {
  return apiFetch<AiOutputListResponse>(`/ai-outputs?${toQueryString(query)}`).then(
    (response) => response.outputs,
  )
}

export function generateAiOutput(query: AiOutputQuery): Promise<AiOutput> {
  return apiFetch<AiOutput>('/ai-outputs', { method: 'POST', body: query })
}
