import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as apiClient from '../lib/apiClient'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../lib/apiClient')>('../lib/apiClient')
  return { ...actual, apiFetch: vi.fn() }
})

// The real widget loads an external Cloudflare script — mocked here to
// auto-verify immediately so these tests aren't about the widget itself.
vi.mock('../components/Turnstile', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')
  return {
    Turnstile: ({ onVerify }: { onVerify: (token: string) => void }) => {
      useEffect(() => {
        onVerify('test-captcha-token')
      }, [onVerify])
      return null
    },
  }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password/a-real-token?email=jane%40company.com']}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefills the email from the query string', () => {
    renderPage()

    expect((screen.getByLabelText('Email address') as HTMLInputElement).value).toBe('jane@company.com')
  })

  it('submits the token, email, passwords, and captcha token, then redirects to login', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.apiFetch).mockResolvedValue({ message: 'Your password has been reset.' })
    renderPage()

    await user.type(screen.getByLabelText('New password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(apiClient.apiFetch).toHaveBeenCalledWith(
      '/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: {
          token: 'a-real-token',
          email: 'jane@company.com',
          password: 'new-password',
          password_confirmation: 'new-password',
          captcha_token: 'test-captcha-token',
        },
      }),
    )
    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it('shows an error message and does not redirect when the request fails', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('../lib/apiClient')
    vi.mocked(apiClient.apiFetch).mockRejectedValue(new ApiError(422, 'This password reset token is invalid.'))
    renderPage()

    await user.type(screen.getByLabelText('New password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(await screen.findByText('This password reset token is invalid.')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
