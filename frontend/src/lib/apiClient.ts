const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const TOKEN_STORAGE_KEY = 'timeforge_token'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data?.message as string) ?? 'Something went wrong.',
      data?.errors as Record<string, string[]> | undefined,
    )
  }

  return data as T
}

/**
 * For multipart file uploads (Sprint 13 attachments). Identical to
 * apiFetch except the body is FormData and no Content-Type header is
 * set — the browser supplies the multipart boundary itself.
 */
export async function apiFetchUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/api${path}`, { method: 'POST', headers, body: formData })

  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data?.message as string) ?? 'Something went wrong.',
      data?.errors as Record<string, string[]> | undefined,
    )
  }

  return data as T
}

/**
 * For authenticated binary downloads (PDF/Excel exports). Resolves to a
 * Blob on success; on failure, attempts to parse a JSON error body (the
 * backend's abort() responses are JSON even though a successful response
 * here is binary) before falling back to a generic message.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {}

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/api${path}`, { method: 'GET', headers })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      (data?.message as string) ?? 'Something went wrong.',
      data?.errors as Record<string, string[]> | undefined,
    )
  }

  return response.blob()
}
