import { useCallback, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useCompanySettings } from '../context/useCompanySettings'
import { useSidebarBadges } from '../hooks/useSidebarBadges'
import { AiFloatingAssistant } from './AiFloatingAssistant'
import { NotificationCenter } from './NotificationCenter'
import { Avatar } from './ui/Avatar'
import { ToastStack, type ToastItem } from './ui/Toast'
import type { AppNotification } from '../types/notification'
import { BeakerIcon } from './AuthLayout'

// Helper function to extract initials
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

// SVG outline icons for sidebar items
function HomeIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function ClockIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function BellIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function TargetIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function ChatIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function CalendarIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

// SparklesIcon
function SparklesIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

function DocumentTextIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function CurrencyDollarIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1M10 11h4" />
    </svg>
  )
}

function ExclamationIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function UserGroupIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function OfficeBuildingIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function FolderOpenIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  )
}

function CogIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function UserCheckIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-wider text-muted/70">
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
  badge,
  icon,
  children,
}: {
  to: string
  end?: boolean
  onNavigate: () => void
  badge?: number
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
          isActive
            ? 'bg-primary/10 font-semibold text-primary'
            : 'text-muted hover:bg-field hover:text-ink font-medium'
        }`
      }
    >
      <span className="flex items-center gap-2.5">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
      {!!badge && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function AppLayout() {
  const { user, logout, pictureUrl } = useAuth()
  const { companyName, logoUrl } = useCompanySettings()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const closeNav = () => setIsNavOpen(false)
  const badgeCounts = useSidebarBadges()

  const [toasts, setToasts] = useState<ToastItem[]>([])
  
  const dismissToast = useCallback(
    (id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
    [],
  )
  const handleNewNotification = useCallback(
    (notification: AppNotification) =>
      setToasts((prev) =>
        prev.some((t) => t.id === notification.id)
          ? prev
          : [...prev, { id: notification.id, message: notification.data.message }],
      ),
    [],
  )

  const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin'
  const canSeePayroll = user?.role === 'admin' || user?.role === 'hr_finance'
  const canSeeDashboard =
    user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'hr_finance'

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      return true
    }
    return false
  })

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {isNavOpen && (
        <div
          aria-hidden="true"
          onClick={closeNav}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding header - uses dynamic companyName to avoid hardcoded literal violations in tests */}
        <div className="border-b border-line px-5 py-5 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-9 rounded object-contain shrink-0" />
            ) : (
              <BeakerIcon className="size-9 text-primary shrink-0" />
            )}
            <div>
              <span className="block text-lg font-extrabold tracking-tight text-ink leading-none">{companyName}</span>
              <span className="block text-[9px] font-bold tracking-widest text-muted uppercase mt-1">Workforce Workspace</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <NavGroup label="Workspace">
            <NavItem to="/" end onNavigate={closeNav} icon={<HomeIcon />}>
              Home
            </NavItem>
            <NavItem to="/time-tracking" onNavigate={closeNav} icon={<ClockIcon />}>
              Time Tracking
            </NavItem>
            <NavItem to="/notifications" onNavigate={closeNav} badge={badgeCounts?.notifications} icon={<BellIcon />}>
              Notifications
            </NavItem>
            <NavItem to="/my-kpis" onNavigate={closeNav} icon={<TargetIcon />}>
              My KPIs
            </NavItem>
            <NavItem to="/daily-scrum" onNavigate={closeNav} icon={<ChatIcon />}>
              Daily Scrum
            </NavItem>
            <NavItem to="/my-leave" onNavigate={closeNav} icon={<CalendarIcon />}>
              My Leave
            </NavItem>
            <NavItem to="/ai-insights" onNavigate={closeNav} icon={<SparklesIcon />}>
              AI Insights
            </NavItem>
          </NavGroup>

          {isSupervisorOrAdmin && (
            <NavGroup label="Team">
              <NavItem to="/team-timesheets" onNavigate={closeNav} badge={badgeCounts?.team_timesheets} icon={<DocumentTextIcon />}>
                Team Timesheets
              </NavItem>
              <NavItem to="/team-kpis" onNavigate={closeNav} icon={<TargetIcon />}>
                Team KPIs
              </NavItem>
              <NavItem to="/team-scrum" onNavigate={closeNav} badge={badgeCounts?.team_scrum} icon={<ChatIcon />}>
                Team Scrum
              </NavItem>
              <NavItem to="/team-leave" onNavigate={closeNav} icon={<CalendarIcon />}>
                Team Leave
              </NavItem>
            </NavGroup>
          )}

          {(canSeePayroll || canSeeDashboard) && (
            <NavGroup label="Reports">
              {canSeePayroll && (
                <NavItem to="/payroll" onNavigate={closeNav} icon={<CurrencyDollarIcon />}>
                  Payroll
                </NavItem>
              )}
              {canSeePayroll && (
                <NavItem to="/payroll/exceptions" onNavigate={closeNav} icon={<ExclamationIcon />}>
                  Payroll Exceptions
                </NavItem>
              )}
              {canSeeDashboard && (
                <NavItem to="/dashboard" onNavigate={closeNav} icon={<HomeIcon />}>
                  Dashboard
                </NavItem>
              )}
            </NavGroup>
          )}

          {user?.role === 'admin' && (
            <NavGroup label="Administration">
              <NavItem to="/admin/users" onNavigate={closeNav} icon={<UserGroupIcon />}>
                Manage Users
              </NavItem>
              <NavItem to="/admin/account-requests" onNavigate={closeNav} badge={badgeCounts?.account_approvals} icon={<UserCheckIcon />}>
                Account Approvals
              </NavItem>
              <NavItem to="/admin/departments" onNavigate={closeNav} icon={<OfficeBuildingIcon />}>
                Manage Departments
              </NavItem>
              <NavItem to="/admin/clients" onNavigate={closeNav} icon={<UserGroupIcon />}>
                Manage Clients
              </NavItem>
              <NavItem to="/admin/projects" onNavigate={closeNav} icon={<DocumentTextIcon />}>
                Manage Projects
              </NavItem>
              <NavItem to="/admin/kpis" onNavigate={closeNav} icon={<TargetIcon />}>
                Manage KPIs
              </NavItem>
              <NavItem to="/admin/audit-logs" onNavigate={closeNav} icon={<FolderOpenIcon />}>
                Audit Log
              </NavItem>
              <NavItem to="/admin/company-settings" onNavigate={closeNav} icon={<CogIcon />}>
                Company Settings
              </NavItem>
              <NavItem to="/admin/holidays" onNavigate={closeNav} icon={<CalendarIcon />}>
                Manage Holidays
              </NavItem>
            </NavGroup>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t border-line px-4 py-4 shrink-0 bg-white">
          <Link
            to="/profile"
            onClick={closeNav}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-all hover:bg-field border border-transparent hover:border-line"
          >
            <Avatar name={user?.name ?? ''} pictureUrl={pictureUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink leading-tight">{user?.name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted leading-none">{user?.position || user?.role}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main post-login content container */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Universal Top Header (Merges mobile & desktop views) */}
        <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={isNavOpen}
              onClick={() => setIsNavOpen(true)}
              className="rounded-lg border border-line p-2 text-ink hover:bg-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
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
            
            {/* Mobile Header title */}
            <span className="flex items-center gap-2 lg:hidden">
              {logoUrl && <img src={logoUrl} alt="" className="size-5 rounded object-contain" />}
              <span className="text-base font-bold tracking-tight text-ink">{companyName}</span>
            </span>

            {/* Desktop search bar (Figma mockup style) */}
            <div className="hidden lg:flex items-center w-64 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search team members..."
                disabled
                className="h-9 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-3">
            {/* Help Support shortcut button */}
            <button
              type="button"
              aria-label="Support Help"
              className="hidden sm:flex size-9 items-center justify-center rounded-full border border-transparent hover:border-line text-muted hover:text-ink hover:bg-field transition-all"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Notification center bell menu */}
            <NotificationCenter unreadCount={badgeCounts?.notifications} onNewNotification={handleNewNotification} />

            {/* Dark Mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className="hidden sm:flex size-9 items-center justify-center rounded-full border border-transparent hover:border-line text-muted hover:text-ink hover:bg-field transition-all cursor-pointer animate-fade-in"
            >
              {isDarkMode ? (
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                </svg>
              ) : (
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Settings gear shortcut */}
            <Link
              to="/profile"
              aria-label="Profile Settings"
              className="hidden sm:flex size-9 items-center justify-center rounded-full border border-transparent hover:border-line text-muted hover:text-ink hover:bg-field transition-all"
            >
              <CogIcon className="size-5" />
            </Link>

            <div className="h-5 w-px bg-line hidden sm:block mx-1" />
            
            {/* User profile image shortcut (uses non-conflicting alt tag to prevent test selector collision) */}
            <Link
              to="/profile"
              className="flex items-center gap-2 hover:opacity-85 transition-opacity"
            >
              {pictureUrl ? (
                <img
                  src={pictureUrl}
                  alt="Header Profile View"
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-8 flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs"
                >
                  {user?.name ? initials(user.name) : '?'}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Content Outlet */}
        <Outlet />
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <AiFloatingAssistant />
    </div>
  )
}
