import { apiFetch } from './client'
import type { CreateServiceRequest, ImpactResponse, ServiceResponse } from './types'

export const servicesApi = {
  list: () => apiFetch<ServiceResponse[]>('/api/services'),

  impact: (id: number) => apiFetch<ImpactResponse>(`/api/services/${id}/impact`),

  create: (request: CreateServiceRequest) =>
    apiFetch<ServiceResponse>('/api/services', { method: 'POST', body: request }),

  /** `id` depends on `dependsOnId`: an outage of dependsOnId will impact id. */
  addDependency: (id: number, dependsOnId: number) =>
    apiFetch<ServiceResponse>(`/api/services/${id}/dependencies/${dependsOnId}`, { method: 'POST' }),

  removeDependency: (id: number, dependsOnId: number) =>
    apiFetch<ServiceResponse>(`/api/services/${id}/dependencies/${dependsOnId}`, { method: 'DELETE' }),
}
