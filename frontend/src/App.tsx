import { Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/AdminRoute'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { DepartmentsPage } from './pages/admin/DepartmentsPage'
import { ProjectsPage } from './pages/admin/ProjectsPage'
import { UserFormPage } from './pages/admin/UserFormPage'
import { UsersPage } from './pages/admin/UsersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/users/new" element={<UserFormPage />} />
            <Route path="/admin/users/:userId/edit" element={<UserFormPage />} />
            <Route path="/admin/departments" element={<DepartmentsPage />} />
            <Route path="/admin/clients" element={<ClientsPage />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
