import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Shared visual language for the authentication screens (Figma: Authentication,
// "rounded" style — 448px card, #1876f2 primary, #f9fafb inputs).
export const authLabelClass = 'block text-sm font-medium text-ink'

export const authInputClass =
  'mt-2 h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export const authButtonClass =
  'h-11 w-full rounded-lg bg-primary text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-card">
        <h1 className="text-2xl font-bold leading-8 tracking-[-0.6px] text-ink">{title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}

export function BackToSignInLink() {
  return (
    <p className="mt-6 text-center">
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <svg
          aria-hidden="true"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to sign in
      </Link>
    </p>
  )
}
