import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as apiClient from '../lib/apiClient'
import { ForgotPasswordPage } from './ForgotPasswordPage'

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

const GENERIC_MESSAGE = 'If an account exists for that email, a password reset link has been sent.'

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the same generic message the backend returns, regardless of whether the email exists', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.apiFetch).mockResolvedValue({ message: GENERIC_MESSAGE })
    renderPage()

    await user.type(screen.getByLabelText('Email address'), 'anyone@company.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(GENERIC_MESSAGE)).toBeInTheDocument()
  })

  it('does not assume or hardcode the pre-Sprint-18 message text', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.apiFetch).mockResolvedValue({ message: GENERIC_MESSAGE })
    renderPage()

    await user.type(screen.getByLabelText('Email address'), 'someone@company.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    await screen.findByText(GENERIC_MESSAGE)
    expect(screen.queryByText(/we have emailed your password reset link/i)).not.toBeInTheDocument()
  })

  it('includes the captcha token from the widget in the submitted payload', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.apiFetch).mockResolvedValue({ message: GENERIC_MESSAGE })
    renderPage()

    await user.type(screen.getByLabelText('Email address'), 'anyone@company.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(apiClient.apiFetch).toHaveBeenCalledWith(
      '/forgot-password',
      expect.objectContaining({
        body: { email: 'anyone@company.com', captcha_token: 'test-captcha-token' },
      }),
    )
  })
})
