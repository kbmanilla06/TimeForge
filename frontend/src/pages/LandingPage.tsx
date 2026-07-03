import { Link } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'

const FEATURES: { title: string; description: string }[] = [
  {
    title: 'Time Tracking',
    description: 'Start/stop timer or manual entries, with overlap and future-date protection built in.',
  },
  {
    title: 'Smart Timesheets',
    description: 'Submit for review; supervisors approve, reject, or request revision — every step logged.',
  },
  {
    title: 'Daily Scrum',
    description: 'Structured daily updates with blockers, reviewed and commented on by your supervisor.',
  },
  {
    title: 'KPI Tracking',
    description: 'Numeric goals assigned to people or departments, credited only on approved work.',
  },
  {
    title: 'Payroll Preparation',
    description: 'Semi-monthly periods with configurable overtime, PDF/Excel exports ready for review.',
  },
  {
    title: 'AI Insights',
    description: 'Seven on-demand summaries — daily, weekly, KPI, payroll — fully local, zero external calls.',
  },
]

const BENEFITS: string[] = [
  'Role-scoped access enforced server-side, not just hidden buttons — every boundary is a 403, not a guess.',
  'Reviewed productivity, not self-reported: KPI and payroll figures only move on supervisor approval.',
  'One place for time, timesheets, scrums, KPIs, payroll, and AI insights — no spreadsheets stitched together.',
]

function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="mt-10 overflow-hidden rounded-2xl border border-line bg-white shadow-card"
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-field px-4 py-3">
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
      </div>
      <div className="grid grid-cols-3 gap-3 p-5">
        <div className="rounded-lg border border-line bg-field p-3">
          <div className="h-2 w-10 rounded bg-line" />
          <div className="mt-3 h-5 w-14 rounded bg-primary/25" />
        </div>
        <div className="rounded-lg border border-line bg-field p-3">
          <div className="h-2 w-10 rounded bg-line" />
          <div className="mt-3 h-5 w-14 rounded bg-primary/25" />
        </div>
        <div className="rounded-lg border border-line bg-field p-3">
          <div className="h-2 w-10 rounded bg-line" />
          <div className="mt-3 h-5 w-14 rounded bg-primary/25" />
        </div>
      </div>
      <div className="flex items-end gap-2 px-5 pb-6">
        {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-primary/20" style={{ height: `${h}px` }} />
        ))}
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <a
        href="#login-form-email"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to sign in
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-bold tracking-tight text-ink">TimeForge</span>
          <nav className="flex items-center gap-2">
            <a
              href="#sign-in"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-field sm:inline-block"
            >
              Sign In
            </a>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Create Account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Workforce performance,{' '}
                <span className="text-primary">reviewed and provable</span> — not self-reported.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                TimeForge is an AI-assisted workforce management platform for time tracking, smart
                timesheets, daily scrums, KPIs, payroll preparation, and management dashboards — built
                for teams who need every number to hold up to review.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#sign-in"
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Sign In
                </a>
                <Link
                  to="/register"
                  className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-ink hover:bg-field"
                >
                  Create Account
                </Link>
              </div>

              <DashboardPreview />
              <p className="mt-2 text-xs text-muted">Illustrative preview — not live data.</p>
            </div>

            <div id="sign-in" className="scroll-mt-8 rounded-2xl border border-line bg-white p-8 shadow-card">
              <h2 className="text-2xl font-bold leading-8 tracking-[-0.6px] text-ink">Sign In</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Enter your credentials to access your account.
              </p>
              <div className="mt-6">
                <LoginForm id="login-form" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-canvas py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Everything one team needs to run itself</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Six modules, one system of record — no exporting between spreadsheets to see the full
              picture of who worked on what.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Why teams choose TimeForge</h2>
            <ul className="mt-8 space-y-4">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-base leading-relaxed text-ink">
                  <span aria-hidden="true" className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-line bg-canvas py-16">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Ready to get started?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted">
              Sign in if you already have an account, or request one to join your team.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="#sign-in"
                className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Sign In
              </a>
              <Link
                to="/register"
                className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-ink hover:bg-field"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-semibold text-ink">TimeForge</span>
            <Link to="/forgot-password" className="hover:text-ink">
              Forgot Password?
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
