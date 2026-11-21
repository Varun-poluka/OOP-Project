import { apiFetch } from './client'
import type { ImpactResponse, ServiceResponse } from './types'

export const servicesApi = {
  list: () => apiFetch<ServiceResponse[]>('/api/services'),

  impact: (id: number) => apiFetch<ImpactResponse>(`/api/services/${id}/impact`),
}
