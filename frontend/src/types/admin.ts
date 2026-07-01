import type { Role, User } from './auth'

export interface Department {
  id: number
  name: string
  users_count?: number
}

export interface AdminUser extends User {
  department?: Department | null
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: Role
  department_id?: number | null
}

export interface UpdateUserPayload {
  name: string
  email: string
  role: Role
  department_id: number | null
}

export interface CreateDepartmentPayload {
  name: string
}

export interface UpdateDepartmentPayload {
  name: string
}
