export interface Holiday {
  id: number
  date: string
  name: string
  created_by: number
}

export interface CreateHolidayPayload {
  date: string
  name: string
}

export interface UpdateHolidayPayload {
  date?: string
  name?: string
}
