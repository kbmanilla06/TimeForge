import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../lib/apiClient'
import { authButtonClass, authInputClass, authLabelClass } from './AuthLayout'

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
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

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function LoginForm({ id = 'login-form' }: { id?: string }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      setIsSuccess(true)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to log in.')
      setIsSubmitting(false)
    }
  }

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label htmlFor={`${id}-email`} className={authLabelClass}>
          Email Address
        </label>
        <div className="relative mt-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <MailIcon className="size-4" />
          </div>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            required
            placeholder="alex.johnson@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${authInputClass} mt-0 pl-10`}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor={`${id}-password`} className={authLabelClass}>
            Password
          </label>
          <Link
            to="/forgot-password"
            aria-label="Forgot Password?"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <LockIcon className="size-4" />
          </div>
          <input
            id={`${id}-password`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${authInputClass} mt-0 pl-10 pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-r-lg"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          className="size-4 rounded border-line text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-ink cursor-pointer">
          Remember me for 30 days
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-label={isSuccess ? 'Signed in — redirecting…' : isSubmitting ? 'Signing in…' : 'Log In'}
        className={authButtonClass}
      >
        {isSuccess ? (
          'Signed in — redirecting…'
        ) : isSubmitting ? (
          'Signing in…'
        ) : (
          <>
            Sign In
            <svg
              className="size-4 stroke-current ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </>
        )}
      </button>

      <div className="relative flex items-center justify-center my-6">
        <hr className="w-full border-line" />
        <span className="absolute bg-white px-3 text-xs text-muted font-medium">Or continue with</span>
      </div>

      <button
        type="button"
        disabled
        className="h-11 w-full rounded-lg border border-line bg-white text-sm font-medium text-ink hover:bg-field disabled:opacity-75 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
      >
        <svg className="size-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.966 11.966 0 0 0 12 0C7.055 0 2.8 2.855.8 7.009l4.466 2.756z"
          />
          <path
            fill="#FBBC05"
            d="M16.04 15.345c-1.07.727-2.455 1.164-4.04 1.164a7.073 7.073 0 0 1-6.734-4.856L.8 14.41C2.8 18.564 7.055 21.42 12 21.42c3.273 0 6.018-1.09 8.018-2.964l-3.978-3.11z"
          />
          <path
            fill="#4285F4"
            d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.51h6.446a5.513 5.513 0 0 1-2.391 3.618l3.977 3.11C22.345 19.109 23.49 16.036 23.49 12.273z"
          />
          <path
            fill="#34A853"
            d="M5.266 11.655a7.078 7.078 0 0 1 0-3.8l-4.466-2.756a11.966 11.966 0 0 0 0 9.31l4.466-2.754z"
          />
        </svg>
        Sign in with Google
      </button>
    </form>
  )
}
