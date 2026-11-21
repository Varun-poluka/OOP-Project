import type { IncidentResponse, IncidentStatus, UserResponse } from '@/api/types'

export type IncidentAction =
  | 'classify'
  | 'assign'
  | 'reassign'
  | 'acknowledge'
  | 'start'
  | 'addNote'
  | 'resolve'
  | 'verify'
  | 'reopen'
  | 'close'

/** The incident fields the decision needs, so tests can pass small objects. */
export type ActionSubject = Pick<IncidentResponse, 'status' | 'reporterId' | 'assignedTechnicianId'>

// Mirrors the backend: the *State classes say which actions each status allows,
// SecurityConfig says which role may call each one, and the service checks ownership.
// Status -> actions, one table per kind of actor.
const REPORTER_ACTIONS: Partial<Record<IncidentStatus, IncidentAction[]>> = {
  RESOLVED: ['verify', 'reopen'],
  VERIFIED: ['close'],
}

const ASSIGNED_TECHNICIAN_ACTIONS: Partial<Record<IncidentStatus, IncidentAction[]>> = {
  ASSIGNED: ['acknowledge'],
  ACKNOWLEDGED: ['start', 'addNote'],
  IN_PROGRESS: ['addNote', 'resolve'],
}

const ADMIN_ACTIONS: Partial<Record<IncidentStatus, IncidentAction[]>> = {
  NEW: ['classify'],
  CLASSIFIED: ['assign'],
  ASSIGNED: ['reassign'],
  ACKNOWLEDGED: ['reassign'],
  IN_PROGRESS: ['reassign'],
  VERIFIED: ['close'],
}

/**
 * Which actions `user` may take on `incident` right now.
 * The page shows exactly these buttons and nothing else, so the rules live in one place.
 * (The backend still enforces them; this only decides what the UI offers.)
 */
export function availableActions(incident: ActionSubject, user: UserResponse): IncidentAction[] {
  if (user.role === 'EMPLOYEE') {
    if (incident.reporterId !== user.id) return []
    return REPORTER_ACTIONS[incident.status] ?? []
  }
  if (user.role === 'TECHNICIAN') {
    if (incident.assignedTechnicianId === null || incident.assignedTechnicianId !== user.id) return []
    return ASSIGNED_TECHNICIAN_ACTIONS[incident.status] ?? []
  }
  return ADMIN_ACTIONS[incident.status] ?? []
}

/** Actions that change the status; these ask for confirmation first. addNote does not. */
export function changesStatus(action: IncidentAction): boolean {
  return action !== 'addNote'
}
