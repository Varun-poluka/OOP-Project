import { apiFetch } from './client'
import type { TechnicianResponse } from './types'

export const techniciansApi = {
  list: () => apiFetch<TechnicianResponse[]>('/api/technicians'),
  /** The logged-in technician's own skills and workload. */
  me: () => apiFetch<TechnicianResponse>('/api/technicians/me'),
}
