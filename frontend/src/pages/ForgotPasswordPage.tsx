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
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
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
