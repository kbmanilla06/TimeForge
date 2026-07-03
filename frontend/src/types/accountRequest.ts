export type AccountRequestStatus = 'submitted' | 'approved' | 'rejected'

export interface AccountRequestApplicant {
  id: number
  name: string
  email: string
  employee_id: string | null
  position: string | null
  contact_number: string | null
  department: { id: number; name: string } | null
}

export interface AccountRequestReviewer {
  id: number
  name: string
}

export interface AccountRequest {
  id: number
  status: AccountRequestStatus
  terms_accepted_at: string
  reviewed_by: number | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  user: AccountRequestApplicant
  reviewer: AccountRequestReviewer | null
}
