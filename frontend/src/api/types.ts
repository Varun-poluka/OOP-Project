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

export type Impact = 'LOW' | 'MEDIUM' | 'HIGH'
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH'

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
  notes: NoteResponse[]
  auditTrail: AuditRecordResponse[]
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
  reporterId: string
  categoryName: string
  serviceId: number
  impact: Impact
  urgency: Urgency
}

export type TechnicianActionRequest = { technicianId: string }
export type ClassifyRequest = { priority: Priority }
export type AddNoteRequest = { technicianId: string; text: string }
export type ResolveRequest = { technicianId: string; resolutionDetails: string }
export type VerifyRequest = { employeeId: string }
export type CloseRequest = { userId: string }
export type ReopenRequest = { employeeId: string; reason: string }
export type ReassignRequest = { newTechnicianId: string; actorId: string }

// ---- Notifications ----

export type NotificationResponse = {
  id: number
  incidentId: string
  message: string
  read: boolean
  createdAt: LocalDateTimeString
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

export type SlaCheckResponse = { checkedAt: LocalDateTimeString; breachesRecorded: number }

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
