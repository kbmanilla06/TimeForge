import type { Role, User } from './auth'

export interface Department {
  id: number
  name: string
  description: string | null
  users_count?: number
}

export interface AdminUser extends User {
  department?: Department | null
  hourly_rate?: number | null
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
  hourly_rate?: number | null
}

export interface CreateDepartmentPayload {
  name: string
  description?: string | null
}

export interface UpdateDepartmentPayload {
  name: string
  description?: string | null
}

export interface Client {
  id: number
  name: string
  projects_count?: number
}

export interface Project {
  id: number
  name: string
  client_id: number | null
  client?: Client | null
}

export interface CreateClientPayload {
  name: string
}

export interface UpdateClientPayload {
  name: string
}

export interface CreateProjectPayload {
  name: string
  client_id?: number | null
}

export interface UpdateProjectPayload {
  name: string
  client_id: number | null
}
