import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-4 py-3">
        <nav className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <Link to="/">Home</Link>
            <Link to="/time-tracking">Time Tracking</Link>
            <Link to="/notifications">Notifications</Link>
            <Link to="/my-kpis">My KPIs</Link>
            <Link to="/daily-scrum">Daily Scrum</Link>
            {(user?.role === 'supervisor' || user?.role === 'admin') && (
              <>
                <Link to="/team-timesheets">Team Timesheets</Link>
                <Link to="/team-kpis">Team KPIs</Link>
                <Link to="/team-scrum">Team Scrum</Link>
              </>
            )}
            {(user?.role === 'admin' || user?.role === 'hr_finance') && <Link to="/payroll">Payroll</Link>}
            {(user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'hr_finance') && (
              <Link to="/dashboard">Dashboard</Link>
            )}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin/users">Manage Users</Link>
                <Link to="/admin/departments">Manage Departments</Link>
                <Link to="/admin/clients">Manage Clients</Link>
                <Link to="/admin/projects">Manage Projects</Link>
                <Link to="/admin/kpis">Manage KPIs</Link>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            Log out
          </button>
        </nav>
      </header>

      <Outlet />
    </div>
  )
}
