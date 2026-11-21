import { apiFetch } from './client'
import type { TechnicianResponse } from './types'

export const techniciansApi = {
  list: () => apiFetch<TechnicianResponse[]>('/api/technicians'),
}
