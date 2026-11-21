import { apiFetch } from './client'
import type {
  LocalDateTimeString,
  Priority,
  SlaCheckResponse,
  SlaPolicyResponse,
  StrategyResponse,
  UpdateSlaPolicyRequest,
} from './types'

export const adminApi = {
  getStrategy: () => apiFetch<StrategyResponse>('/api/admin/assignment-strategy'),

  changeStrategy: (strategy: string) =>
    apiFetch<StrategyResponse>('/api/admin/assignment-strategy', { method: 'PUT', body: { strategy } }),

  slaPolicies: () => apiFetch<SlaPolicyResponse[]>('/api/admin/sla/policies'),

  updateSlaPolicy: (priority: Priority, request: UpdateSlaPolicyRequest) =>
    apiFetch<SlaPolicyResponse>(`/api/admin/sla/policies/${priority}`, { method: 'PUT', body: request }),

  runSlaCheck: (at?: LocalDateTimeString) =>
    apiFetch<SlaCheckResponse>('/api/admin/sla/check', { method: 'POST', query: { at } }),
}
