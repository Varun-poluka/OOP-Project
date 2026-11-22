import { apiFetch } from './client'
import type {
  AuditLogCriteria,
  AuditLogEntry,
  CategoryResponse,
  CreateCategoryRequest,
  CreateUserRequest,
  LocalDateTimeString,
  PageResponse,
  Priority,
  SlaCheckResponse,
  SlaPolicyResponse,
  StrategyResponse,
  TechnicianResponse,
  UpdateSlaPolicyRequest,
  UpdateTechnicianRequest,
  UserResponse,
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

  // ---- users ----

  users: () => apiFetch<UserResponse[]>('/api/admin/users'),

  createUser: (request: CreateUserRequest) =>
    apiFetch<UserResponse>('/api/admin/users', { method: 'POST', body: request }),

  deactivateUser: (id: string) =>
    apiFetch<UserResponse>(`/api/admin/users/${encodeURIComponent(id)}/deactivate`, { method: 'PATCH' }),

  reactivateUser: (id: string) =>
    apiFetch<UserResponse>(`/api/admin/users/${encodeURIComponent(id)}/reactivate`, { method: 'PATCH' }),

  updateTechnician: (id: string, request: UpdateTechnicianRequest) =>
    apiFetch<TechnicianResponse>(`/api/admin/technicians/${encodeURIComponent(id)}`, { method: 'PUT', body: request }),

  // ---- categories and audit ----

  createCategory: (request: CreateCategoryRequest) =>
    apiFetch<CategoryResponse>('/api/admin/categories', { method: 'POST', body: request }),

  /** page is 0-based, like the backend. */
  audit: (criteria: AuditLogCriteria, page: number, size: number) =>
    apiFetch<PageResponse<AuditLogEntry>>('/api/admin/audit', { query: { ...criteria, page, size } }),
}
