import { apiFetch } from './client'
import type {
  AddNoteRequest,
  CloseRequest,
  CreateIncidentRequest,
  IncidentResponse,
  IncidentSearchCriteria,
  IncidentStatus,
  PageResponse,
  Priority,
  ReassignRequest,
  ReopenRequest,
  ResolveRequest,
  TechnicianActionRequest,
  VerifyRequest,
} from './types'

// One function per endpoint in IncidentController. encodeURIComponent keeps odd IDs safe in the URL.
const incidentPath = (id: string) => `/api/incidents/${encodeURIComponent(id)}`

export type PageRequest = { page?: number; size?: number; sort?: string }

export const incidentsApi = {
  report: (request: CreateIncidentRequest) =>
    apiFetch<IncidentResponse>('/api/incidents', { method: 'POST', body: request }),

  get: (id: string) => apiFetch<IncidentResponse>(incidentPath(id)),

  list: (status?: IncidentStatus) => apiFetch<IncidentResponse[]>('/api/incidents', { query: { status } }),

  search: (criteria: IncidentSearchCriteria, page: PageRequest = {}) =>
    apiFetch<PageResponse<IncidentResponse>>('/api/incidents/search', { query: { ...criteria, ...page } }),

  acknowledge: (id: string, request: TechnicianActionRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/acknowledge`, { method: 'PATCH', body: request }),

  classify: (id: string, priority: Priority) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/classify`, { method: 'PATCH', body: { priority } }),

  assign: (id: string, request: TechnicianActionRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/assign`, { method: 'PATCH', body: request }),

  start: (id: string, request: TechnicianActionRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/start`, { method: 'PATCH', body: request }),

  addNote: (id: string, request: AddNoteRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/notes`, { method: 'POST', body: request }),

  resolve: (id: string, request: ResolveRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/resolve`, { method: 'PATCH', body: request }),

  verify: (id: string, request: VerifyRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/verify`, { method: 'PATCH', body: request }),

  close: (id: string, request: CloseRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/close`, { method: 'PATCH', body: request }),

  reopen: (id: string, request: ReopenRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/reopen`, { method: 'PATCH', body: request }),

  reassign: (id: string, request: ReassignRequest) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/reassign`, { method: 'PATCH', body: request }),
}
