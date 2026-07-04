import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as apiClient from '../lib/apiClient'
import { ApiError } from '../lib/apiClient'
import type { User } from '../types/auth'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

vi.mock('../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../lib/apiClient')>('../lib/apiClient')
  return { ...actual, apiFetch: vi.fn() }
})

vi.mock('../lib/profileApi', () => ({
  getProfilePictureBlob: vi.fn().mockResolvedValue(null),
}))

const TOKEN_KEY = 'timeforge_token'

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Jane Employee',
    email: 'jane@company.com',
    role: 'employee',
    status: 'active',
    department_id: null,
    ...overrides,
  }
}

function Probe() {
  const { user, isLoading, refreshUser } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? user.name : 'none'}</span>
      <button onClick={() => void refreshUser()}>refresh</button>
    </div>
  )
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider session persistence (Sprint 38)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('clears the token when the initial /me check gets a genuine 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    vi.mocked(apiClient.apiFetch).mockRejectedValue(new ApiError(401, 'Unauthenticated.'))

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('preserves the token when the initial /me check is rate-limited (429)', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    vi.mocked(apiClient.apiFetch).mockRejectedValue(new ApiError(429, 'Too Many Attempts.'))

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(localStorage.getItem(TOKEN_KEY)).toBe('a-token')
  })

  it('preserves the token when the initial /me check fails for a non-ApiError reason (network error)', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    vi.mocked(apiClient.apiFetch).mockRejectedValue(new Error('Failed to fetch'))

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(localStorage.getItem(TOKEN_KEY)).toBe('a-token')
  })

  it('refreshUser() preserves the current user and token when rate-limited', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    vi.mocked(apiClient.apiFetch)
      .mockResolvedValueOnce({ user: mockUser() })
      .mockRejectedValueOnce(new ApiError(429, 'Too Many Attempts.'))

    const user = userEvent.setup()
    renderProbe()
    await screen.findByText('Jane Employee')

    await user.click(screen.getByText('refresh'))

    await waitFor(() => expect(apiClient.apiFetch).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('user')).toHaveTextContent('Jane Employee')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('a-token')
  })

  it('refreshUser() clears the user and token on a genuine 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token')
    vi.mocked(apiClient.apiFetch)
      .mockResolvedValueOnce({ user: mockUser() })
      .mockRejectedValueOnce(new ApiError(401, 'Unauthenticated.'))

    const user = userEvent.setup()
    renderProbe()
    await screen.findByText('Jane Employee')

    await user.click(screen.getByText('refresh'))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
