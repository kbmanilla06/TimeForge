import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Assumes it is only ever rendered inside ProtectedRoute, which already
 * guarantees an authenticated, non-loading user before this mounts.
 * Per the Sprint 11 permission matrix, HR/Finance has no AI access.
 */
export function AiInsightsRoute() {
  const { user } = useAuth()

  if (user?.role !== 'employee' && user?.role !== 'supervisor' && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
