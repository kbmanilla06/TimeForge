import { Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/AdminRoute'
import { AiInsightsRoute } from './components/AiInsightsRoute'
import { AppLayout } from './components/AppLayout'
import { DashboardRoute } from './components/DashboardRoute'
import { PayrollRoute } from './components/PayrollRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SupervisorRoute } from './components/SupervisorRoute'
import { AiInsightsPage } from './pages/AiInsightsPage'
import { DailyScrumPage } from './pages/DailyScrumPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { MyKpisPage } from './pages/MyKpisPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PayrollPage } from './pages/PayrollPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TeamKpisPage } from './pages/TeamKpisPage'
import { TeamScrumPage } from './pages/TeamScrumPage'
import { TeamTimesheetsPage } from './pages/TeamTimesheetsPage'
import { TimeTrackingPage } from './pages/TimeTrackingPage'
import { AccountRequestsPage } from './pages/admin/AccountRequestsPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { DepartmentsPage } from './pages/admin/DepartmentsPage'
import { KpisPage } from './pages/admin/KpisPage'
import { ProjectsPage } from './pages/admin/ProjectsPage'
import { UserFormPage } from './pages/admin/UserFormPage'
import { UsersPage } from './pages/admin/UsersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/time-tracking" element={<TimeTrackingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/my-kpis" element={<MyKpisPage />} />
          <Route path="/daily-scrum" element={<DailyScrumPage />} />

          <Route element={<SupervisorRoute />}>
            <Route path="/team-timesheets" element={<TeamTimesheetsPage />} />
            <Route path="/team-kpis" element={<TeamKpisPage />} />
            <Route path="/team-scrum" element={<TeamScrumPage />} />
          </Route>

          <Route element={<PayrollRoute />}>
            <Route path="/payroll" element={<PayrollPage />} />
          </Route>

          <Route element={<DashboardRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route element={<AiInsightsRoute />}>
            <Route path="/ai-insights" element={<AiInsightsPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/users/new" element={<UserFormPage />} />
            <Route path="/admin/users/:userId/edit" element={<UserFormPage />} />
            <Route path="/admin/account-requests" element={<AccountRequestsPage />} />
            <Route path="/admin/departments" element={<DepartmentsPage />} />
            <Route path="/admin/clients" element={<ClientsPage />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
            <Route path="/admin/kpis" element={<KpisPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
