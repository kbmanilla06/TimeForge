import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted/80">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  to,
  end,
  onNavigate,
  children,
}: {
  to: string
  end?: boolean
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted hover:bg-field hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const closeNav = () => setIsNavOpen(false)

  const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin'
  const canSeePayroll = user?.role === 'admin' || user?.role === 'hr_finance'
  const canSeeDashboard =
    user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'hr_finance'

  return (
    <div className="flex min-h-screen bg-canvas">
      {isNavOpen && (
        <div
          aria-hidden="true"
          onClick={closeNav}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-line bg-white transition-transform lg:static lg:translate-x-0 ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-line px-5 py-4">
          <span className="text-lg font-bold tracking-tight text-ink">TimeForge</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <NavGroup label="Workspace">
            <NavItem to="/" end onNavigate={closeNav}>
              Home
            </NavItem>
            <NavItem to="/time-tracking" onNavigate={closeNav}>
              Time Tracking
            </NavItem>
            <NavItem to="/notifications" onNavigate={closeNav}>
              Notifications
            </NavItem>
            <NavItem to="/my-kpis" onNavigate={closeNav}>
              My KPIs
            </NavItem>
            <NavItem to="/daily-scrum" onNavigate={closeNav}>
              Daily Scrum
            </NavItem>
            <NavItem to="/ai-insights" onNavigate={closeNav}>
              AI Insights
            </NavItem>
          </NavGroup>

          {isSupervisorOrAdmin && (
            <NavGroup label="Team">
              <NavItem to="/team-timesheets" onNavigate={closeNav}>
                Team Timesheets
              </NavItem>
              <NavItem to="/team-kpis" onNavigate={closeNav}>
                Team KPIs
              </NavItem>
              <NavItem to="/team-scrum" onNavigate={closeNav}>
                Team Scrum
              </NavItem>
            </NavGroup>
          )}

          {(canSeePayroll || canSeeDashboard) && (
            <NavGroup label="Reports">
              {canSeePayroll && (
                <NavItem to="/payroll" onNavigate={closeNav}>
                  Payroll
                </NavItem>
              )}
              {canSeeDashboard && (
                <NavItem to="/dashboard" onNavigate={closeNav}>
                  Dashboard
                </NavItem>
              )}
            </NavGroup>
          )}

          {user?.role === 'admin' && (
            <NavGroup label="Administration">
              <NavItem to="/admin/users" onNavigate={closeNav}>
                Manage Users
              </NavItem>
              <NavItem to="/admin/account-requests" onNavigate={closeNav}>
                Account Approvals
              </NavItem>
              <NavItem to="/admin/departments" onNavigate={closeNav}>
                Manage Departments
              </NavItem>
              <NavItem to="/admin/clients" onNavigate={closeNav}>
                Manage Clients
              </NavItem>
              <NavItem to="/admin/projects" onNavigate={closeNav}>
                Manage Projects
              </NavItem>
              <NavItem to="/admin/kpis" onNavigate={closeNav}>
                Manage KPIs
              </NavItem>
            </NavGroup>
          )}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
          <p className="mt-0.5 text-xs text-muted">{user?.role}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(true)}
            className="rounded-lg border border-line p-2 text-ink hover:bg-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <span className="text-base font-bold tracking-tight text-ink">TimeForge</span>
        </header>

        <Outlet />
      </div>
    </div>
  )
}
