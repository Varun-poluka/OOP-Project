// TypeScript mirrors of the backend DTOs in backend/src/main/java/com/itsm/dto.
// Java records become TS types with the same field names, because Jackson writes
// each record component as a JSON property of the same name.
//
// Date/time fields arrive as ISO strings:
//  - LocalDateTime (no timezone) looks like "2026-11-21T10:00:00"
//  - Instant (UTC) looks like "2026-11-21T10:00:00Z"
// We keep them as strings here and parse them where they are used.

// ---- Enums (com.itsm.domain) as string-literal unions ----

export const INCIDENT_STATUSES = [
  'NEW',
  'CLASSIFIED',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const
export type Priority = (typeof PRIORITIES)[number]

export const IMPACTS = ['LOW', 'MEDIUM', 'HIGH'] as const
export type Impact = (typeof IMPACTS)[number]
export const URGENCIES = ['LOW', 'MEDIUM', 'HIGH'] as const
export type Urgency = (typeof URGENCIES)[number]

/** com.itsm.service.intelligence.RiskLevel: how close the most urgent running SLA clock is to breaching. */
export const RISK_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'BREACHED'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const ROLES = ['EMPLOYEE', 'TECHNICIAN', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

/** LocalDateTime from the backend, e.g. "2026-11-21T10:00:00". */
export type LocalDateTimeString = string
/** Instant from the backend, e.g. "2026-11-21T10:00:00Z". */
export type InstantString = string

// ---- Auth ----

export type LoginRequest = { email: string; password: string }

export type UserResponse = { id: string; name: string; email: string; role: Role }

export type LoginResponse = { token: string; expiresAt: InstantString; user: UserResponse }

// ---- Errors ----

/** Spring's ProblemDetail (RFC 9457) JSON body, sent by GlobalExceptionHandler. */
export type ProblemDetail = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}

// ---- Incidents ----

export type NoteResponse = {
  authorName: string
  text: string
  createdAt: LocalDateTimeString
}

export type AuditRecordResponse = {
  timestamp: LocalDateTimeString
  actorName: string
  action: string
  previousStatus: IncidentStatus | null
  newStatus: IncidentStatus | null
  description: string | null
}

export type IncidentResponse = {
  id: string
  title: string
  description: string | null
  status: IncidentStatus
  priority: Priority | null // null until the incident is classified
  impact: Impact
  urgency: Urgency
  categoryName: string
  serviceName: string
  reporterId: string
  reporterName: string
  assignedTechnicianId: string | null
  assignedTechnicianName: string | null
  resolutionDetails: string | null
  createdAt: LocalDateTimeString
  acknowledgedAt: LocalDateTimeString | null
  resolvedAt: LocalDateTimeString | null
  closedAt: LocalDateTimeString | null
  responseDueAt: LocalDateTimeString | null
  resolutionDueAt: LocalDateTimeString | null
  responseBreached: boolean
  resolutionBreached: boolean
  responseAtRisk: boolean
  resolutionAtRisk: boolean
  riskLevel: RiskLevel
  /** Share (0-100+) of the most urgent running SLA window already used; null when no clock runs. */
  slaPercentUsed: number | null
  notes: NoteResponse[]
  auditTrail: AuditRecordResponse[]
  /** Filled only in the response to POST /api/incidents; empty everywhere else. */
  possibleDuplicates: DuplicateCandidate[]
}

/**
 * DuplicateCandidateResponse. The backend uses @JsonInclude(NON_NULL), so for employees
 * score and reasons are *missing* from the JSON (undefined here), not null.
 */
export type DuplicateCandidate = {
  incidentId: string
  title: string
  status: IncidentStatus
  score?: number
  reasons?: string[]
}

export type DuplicateCheckRequest = {
  title: string
  description?: string
  categoryName?: string
  affectedServiceId?: number
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Query parameters for GET /api/incidents/search (IncidentSearchCriteria). */
export type IncidentSearchCriteria = {
  status?: IncidentStatus
  priority?: Priority
  categoryName?: string
  technicianId?: string
  reporterId?: string
  from?: LocalDateTimeString
  to?: LocalDateTimeString
  breached?: boolean
  text?: string
}

export type CreateIncidentRequest = {
  title: string
  description?: string
  categoryName: string
  serviceId: number
  impact: Impact
  urgency: Urgency
  /** Admins only: the employee this incident is reported for. */
  onBehalfOfEmployeeId?: string
}

// Action bodies. The acting user comes from the JWT on the backend, never from the body;
// acknowledge, start, verify and close have no body at all.
export type ClassifyRequest = { priority: Priority }
export type AssignRequest = { technicianId: string }
export type ReassignRequest = { newTechnicianId: string }
export type AddNoteRequest = { text: string }
export type ResolveRequest = { resolutionDetails: string }
export type ReopenRequest = { reason: string }

/** TechnicianRecommendationResponse: one ranked technician for an incident (admin only). */
export type TechnicianRecommendation = {
  technicianId: string
  name: string
  score: number
  available: boolean
  activeIncidents: number
  maxWorkload: number
  reasons: string[]
}

// ---- Services ----

export type ServiceRef = { id: number; name: string }

export type ServiceResponse = {
  id: number
  name: string
  /** 1 (low) to 3 (critical). */
  businessCriticality: number
  dependsOn: ServiceRef[]
  openIncidentCount: number
}

/** Services that depend (directly or indirectly) on the given one; distance = hops away. */
export type ImpactResponse = {
  serviceId: number
  serviceName: string
  impactedCount: number
  impacted: { id: number; name: string; businessCriticality: number; distance: number }[]
}

// ---- Categories ----

export type CategoryResponse = { name: string; description: string }

// ---- Notifications ----

export type NotificationResponse = {
  id: number
  /** The incident it is about. Null for notifications created before the backend filled it in. */
  incidentId: string | null
  message: string
  read: boolean
  createdAt: LocalDateTimeString
}

/** GET /api/notifications/unread-count, and the data of the SSE "notification" event. */
export type UnreadCountResponse = { unreadCount: number }

// ---- Live updates (GET /api/stream) ----

/** Data of the SSE "incident" event: just enough to decide what to refetch. */
export type IncidentUpdateEvent = {
  incidentId: string
  action: string
  status: IncidentStatus
  priority: Priority | null
  riskLevel: RiskLevel | null
}

// ---- Admin ----

export type SlaPolicyResponse = {
  priority: Priority
  responseMinutes: number
  resolutionMinutes: number
}

export type UpdateSlaPolicyRequest = { responseMinutes: number; resolutionMinutes: number }

export type StrategyResponse = { current: string; available: string[] }
export type ChangeStrategyRequest = { strategy: string }

export type SlaCheckResponse = { checkedAt: LocalDateTimeString; breachesRecorded: number; risksRecorded: number }

// ---- Reports ----

export type CountRow = { key: string; count: number }

/** Compliance values are percentages (0-100); all four are null when there is no data. */
export type SlaSummary = {
  incidents: number
  responseCompliance: number | null
  resolutionCompliance: number | null
  meanMinutesToAcknowledge: number | null
  meanMinutesToResolve: number | null
}

export type TechnicianWorkload = {
  id: string
  name: string
  available: boolean
  openIncidents: number
  resolvedIncidents: number
}

export type ReportSummary = {
  from: LocalDateTimeString | null
  to: LocalDateTimeString | null
  totalIncidents: number
  byStatus: CountRow[]
  byPriority: CountRow[]
  byCategory: CountRow[]
  overall: SlaSummary
  byPriorityPerformance: Partial<Record<Priority, SlaSummary>>
  technicians: TechnicianWorkload[]
}
