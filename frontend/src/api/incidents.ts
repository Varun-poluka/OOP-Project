import { apiFetch } from './client'
import type {
  CreateIncidentRequest,
  DuplicateCandidate,
  DuplicateCheckRequest,
  ImpactResponse,
  IncidentResponse,
  IncidentSearchCriteria,
  IncidentStatus,
  PageResponse,
  Priority,
  TechnicianRecommendation,
  VerifyRequest,
} from './types'

// One function per endpoint in IncidentController. encodeURIComponent keeps odd IDs safe in the URL.
// The backend takes the acting user from the token, so no user IDs are sent.
const incidentPath = (id: string) => `/api/incidents/${encodeURIComponent(id)}`

export type PageRequest = { page?: number; size?: number; sort?: string }

export const incidentsApi = {
  report: (request: CreateIncidentRequest) =>
    apiFetch<IncidentResponse>('/api/incidents', { method: 'POST', body: request }),

  checkDuplicates: (request: DuplicateCheckRequest, signal?: AbortSignal) =>
    apiFetch<DuplicateCandidate[]>('/api/incidents/duplicates/check', { method: 'POST', body: request, signal }),

  get: (id: string) => apiFetch<IncidentResponse>(incidentPath(id)),

  list: (status?: IncidentStatus) => apiFetch<IncidentResponse[]>('/api/incidents', { query: { status } }),

  search: (criteria: IncidentSearchCriteria, page: PageRequest = {}) =>
    apiFetch<PageResponse<IncidentResponse>>('/api/incidents/search', { query: { ...criteria, ...page } }),

  /** The technician's unfinished incidents, most urgent first (sorted by the backend). */
  queue: () => apiFetch<IncidentResponse[]>('/api/incidents/queue'),

  atRisk: () => apiFetch<IncidentResponse[]>('/api/incidents/at-risk'),

  impact: (id: string) => apiFetch<ImpactResponse>(`${incidentPath(id)}/impact`),

  recommendations: (id: string) => apiFetch<TechnicianRecommendation[]>(`${incidentPath(id)}/recommendations`),

  // ---- lifecycle actions ----

  classify: (id: string, priority: Priority) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/classify`, { method: 'PATCH', body: { priority } }),

  assign: (id: string, technicianId: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/assign`, { method: 'PATCH', body: { technicianId } }),

  reassign: (id: string, newTechnicianId: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/reassign`, { method: 'PATCH', body: { newTechnicianId } }),

  acknowledge: (id: string) => apiFetch<IncidentResponse>(`${incidentPath(id)}/acknowledge`, { method: 'PATCH' }),

  start: (id: string) => apiFetch<IncidentResponse>(`${incidentPath(id)}/start`, { method: 'PATCH' }),

  addNote: (id: string, text: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/notes`, { method: 'POST', body: { text } }),

  resolve: (id: string, resolutionDetails: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/resolve`, { method: 'PATCH', body: { resolutionDetails } }),

  /** The reporter's comment; it also answers an open information request. */
  addComment: (id: string, text: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/comments`, { method: 'POST', body: { text } }),

  /** The assigned technician asks the reporter a question. */
  requestInfo: (id: string, question: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/info-request`, { method: 'POST', body: { question } }),

  /** feedback is optional: a 1-5 rating and/or a comment. */
  verify: (id: string, feedback: VerifyRequest = {}) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/verify`, { method: 'PATCH', body: feedback }),

  close: (id: string) => apiFetch<IncidentResponse>(`${incidentPath(id)}/close`, { method: 'PATCH' }),

  reopen: (id: string, reason: string) =>
    apiFetch<IncidentResponse>(`${incidentPath(id)}/reopen`, { method: 'PATCH', body: { reason } }),
}
