import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Shared visual language classes (Tailwind v4)
export const authLabelClass = 'block text-sm font-medium text-ink'
export const authInputClass =
  'mt-2 h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all'
export const authButtonClass =
  'h-11 w-full rounded-lg bg-primary text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer'

// Custom SVGs for Branding
export function BeakerIcon({ className = 'size-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 8H26"
        stroke="#131820"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M17 8V14.5C17 15.2 16.7 15.8 16.2 16.3L11.5 21.4C9.5 23.6 9.5 27.1 11.5 29.3L12.5 30.4C13.8 31.7 15.5 32.5 17.3 32.5H22.7C24.5 32.5 26.2 31.7 27.5 30.4L28.5 29.3C30.5 27.1 30.5 23.6 28.5 21.4L23.8 16.3C23.3 15.8 23 15.2 23 14.5V8"
        stroke="#131820"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="21" r="1.5" fill="#4f46e5" />
      <circle cx="23" cy="23" r="1" fill="#4f46e5" />
      <circle cx="17" cy="26" r="2" fill="#4f46e5" />
      <circle cx="21" cy="27" r="1.5" fill="#4f46e5" />
      <path
        d="M13.5 23.5C13.5 23.5 16 22 20 23.5C24 25 26.5 23.5 26.5 23.5"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ClockIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function CalendarIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

export function UsersIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

export function ChartBarIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
    </svg>
  )
}

export function BrandInfoColumn() {
  return (
    <div className="w-full lg:max-w-md space-y-8 py-4">
      <div className="flex items-center gap-3">
        <BeakerIcon className="size-12 text-primary" />
        <span className="text-3xl font-extrabold tracking-tight text-ink">TimeForge</span>
      </div>
      <p className="text-lg leading-relaxed text-ink font-medium">
        TimeForge unifies time tracking, scheduling, analytics, daily work, finance into a single platform.
      </p>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <ClockIcon className="size-5" />
          </div>
          <span className="font-semibold text-ink">Time Tracking & Daily Work</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <CalendarIcon className="size-5" />
          </div>
          <span className="font-semibold text-ink">Scheduling</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <UsersIcon className="size-5" />
          </div>
          <span className="font-semibold text-ink">Role-based Access</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <ChartBarIcon className="size-5" />
          </div>
          <span className="font-semibold text-ink">Analytics & Reports</span>
        </div>
      </div>
    </div>
  )
}

export function AuthHeader() {
  return (
    <header className="w-full py-4 border-b border-line bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link to="/login" className="flex items-center gap-2">
          <BeakerIcon className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tight text-ink">TimeForge</span>
        </Link>
        <a
          href="mailto:support@timeforge.com"
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-field transition-colors"
        >
          Support
        </a>
      </div>
    </header>
  )
}

export function AuthFooter() {
  return (
    <footer className="w-full py-6 border-t border-line bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
        <div>TimeForge &copy; 2026 TimeForge. All rights reserved.</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-ink transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-ink transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}

export function AuthLayout({
  title,
  subtitle,
  children,
  variant = 'centered',
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  variant?: 'split' | 'centered'
}) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between">
      <AuthHeader />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        {variant === 'split' ? (
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 flex justify-center lg:justify-start">
              <BrandInfoColumn />
            </div>
            <div className="lg:col-span-7 flex justify-center lg:justify-end w-full">
              <div className="w-full max-w-[460px] rounded-2xl border border-line bg-white p-8 lg:p-10 shadow-card">
                {title && <h2 className="text-2xl font-bold leading-8 tracking-[-0.6px] text-ink">{title}</h2>}
                {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>}
                <div className="mt-6">{children}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[460px] rounded-2xl border border-line bg-white p-8 lg:p-10 shadow-card">
            {title && <h2 className="text-2xl font-bold leading-8 tracking-[-0.6px] text-ink">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        )}
      </main>

      <AuthFooter />
    </div>
  )
}

export function BackToSignInLink() {
  return (
    <p className="mt-6 text-center">
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink transition-colors"
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
