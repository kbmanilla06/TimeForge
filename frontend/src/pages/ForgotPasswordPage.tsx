import { useState, type FormEvent } from 'react'
import { ApiError, apiFetch } from '../lib/apiClient'
import type { ApiMessageResponse } from '../types/auth'
import {
  AuthLayout,
  BackToSignInLink,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/AuthLayout'
import { Turnstile } from '../components/Turnstile'

function LockResetIcon() {
  return (
    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
      <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16" />
        <rect width="10" height="8" x="7" y="11" rx="1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 11V8.5a2 2 0 014 0V11" />
      </svg>
    </div>
  )
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const response = await apiFetch<ApiMessageResponse>('/forgot-password', {
        method: 'POST',
        body: { email, captcha_token: captchaToken },
      })
      setMessage(response.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send reset link.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
      variant="centered"
    >
      <LockResetIcon />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {message && (
          <p role="alert" className="text-sm text-green-600">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
              <MailIcon className="size-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              placeholder="alex.johnson@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${authInputClass} mt-0 pl-10`}
            />
          </div>
        </div>

        <Turnstile onVerify={setCaptchaToken} />

        <button type="submit" disabled={isSubmitting || !captchaToken} className={authButtonClass}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <BackToSignInLink />
    </AuthLayout>
  )
}
