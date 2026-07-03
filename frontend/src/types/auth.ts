export type Role = 'employee' | 'supervisor' | 'hr_finance' | 'admin'

export type UserStatus = 'pending' | 'active' | 'deactivated'

export interface UserDepartment {
  id: number
  name: string
  description: string | null
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  status: UserStatus
  department_id: number | null
  department?: UserDepartment | null
  position?: string | null
}

export interface LoginResponse {
  user: User
  token: string
}

export interface MeResponse {
  user: User
}

export interface ApiMessageResponse {
  message: string
}
