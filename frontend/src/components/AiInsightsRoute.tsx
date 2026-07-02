import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

/**
 * Assumes it is only ever rendered inside ProtectedRoute, which already
 * guarantees an authenticated, non-loading user before this mounts.
 * Since Sprint 12 every role has at least one AI capability — HR/Finance
 * is limited to payroll validation, enforced server-side and by the
 * page's role-driven tabs.
 */
export function AiInsightsRoute() {
  const { user } = useAuth()

  if (
    user?.role !== 'employee' &&
    user?.role !== 'supervisor' &&
    user?.role !== 'admin' &&
    user?.role !== 'hr_finance'
  ) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
