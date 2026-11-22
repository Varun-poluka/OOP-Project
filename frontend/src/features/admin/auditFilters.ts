import type { AuditLogCriteria } from '@/api/types'

// The audit log page's filters as the user sets them, and how they become query parameters.
export const AUDIT_PAGE_SIZE = 25

/** actorId value meaning "automatic entries" (no user); the backend understands it too. */
export const SYSTEM_ACTOR = 'SYSTEM'

/** Every action code an audit record can have, in roughly lifecycle order, for the Action filter. */
export const AUDIT_ACTIONS = [
  'CREATED',
  'CLASSIFIED',
  'PRIORITY_RAISED',
  'SERVICE_IMPACT',
  'ASSIGNED',
  'REASSIGNED',
  'ACKNOWLEDGED',
  'STARTED',
  'NOTE_ADDED',
  'COMMENT_ADDED',
  'INFO_REQUESTED',
  'INFO_PROVIDED',
  'RESOLVED',
  'REOPENED',
  'VERIFIED',
  'FEEDBACK_GIVEN',
  'CLOSED',
  'SLA_RESPONSE_AT_RISK',
  'SLA_RESOLUTION_AT_RISK',
  'SLA_RESPONSE_BREACHED',
  'SLA_RESOLUTION_BREACHED',
] as const

export type AuditFilters = {
  incidentId: string
  /** '' = everyone. */
  actorId: string
  /** '' = every action. */
  action: string
  /** Calendar days from <input type="date">, "2026-11-21"; '' = open-ended. Both days are included. */
  fromDate: string
  toDate: string
}

export const NO_AUDIT_FILTERS: AuditFilters = { incidentId: '', actorId: '', action: '', fromDate: '', toDate: '' }

/** "2026-11-21" -> "2026-11-22" (the backend's `to` is exclusive, so the chosen day is included). */
export function nextDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return next.toISOString().slice(0, 10)
}

export function toAuditCriteria(filters: AuditFilters): AuditLogCriteria {
  const criteria: AuditLogCriteria = {}
  if (filters.incidentId.trim().length > 0) criteria.incidentId = filters.incidentId.trim().toUpperCase()
  if (filters.actorId.length > 0) criteria.actorId = filters.actorId
  if (filters.action.length > 0) criteria.action = filters.action
  if (filters.fromDate.length > 0) criteria.from = `${filters.fromDate}T00:00:00`
  if (filters.toDate.length > 0) criteria.to = `${nextDay(filters.toDate)}T00:00:00`
  return criteria
}

/** A from-day after the to-day would make the backend answer 400; the page says so instead. */
export function dateRangeError(filters: AuditFilters): string | null {
  if (filters.fromDate.length === 0 || filters.toDate.length === 0) return null
  return filters.fromDate > filters.toDate ? 'The start date is after the end date.' : null
}
