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
  | 'comment'
  | 'requestInfo'

/**
 * The incident fields the decision needs, so tests can pass small objects.
 * pendingInfoRequest may be left out: it then counts as "no open question".
 */
export type ActionSubject = Pick<IncidentResponse, 'status' | 'reporterId' | 'assignedTechnicianId'> &
  Partial<Pick<IncidentResponse, 'pendingInfoRequest'>>

// Mirrors the backend: the *State classes say which actions each status allows,
// SecurityConfig says which role may call each one, and the service checks ownership.
// Status -> actions, one table per kind of actor.
// 'comment' (add information) is allowed until the incident is resolved.
const REPORTER_ACTIONS: Partial<Record<IncidentStatus, IncidentAction[]>> = {
  NEW: ['comment'],
  CLASSIFIED: ['comment'],
  ASSIGNED: ['comment'],
  ACKNOWLEDGED: ['comment'],
  IN_PROGRESS: ['comment'],
  RESOLVED: ['verify', 'reopen'],
  VERIFIED: ['close'],
}

const ASSIGNED_TECHNICIAN_ACTIONS: Partial<Record<IncidentStatus, IncidentAction[]>> = {
  ASSIGNED: ['acknowledge'],
  ACKNOWLEDGED: ['start', 'addNote', 'requestInfo'],
  IN_PROGRESS: ['addNote', 'resolve', 'requestInfo'],
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
    const actions = ASSIGNED_TECHNICIAN_ACTIONS[incident.status] ?? []
    // One question at a time: the backend refuses a second one (409) until the reporter answers.
    const questionOpen = incident.pendingInfoRequest !== undefined && incident.pendingInfoRequest !== null
    return questionOpen ? actions.filter((action) => action !== 'requestInfo') : actions
  }
  return ADMIN_ACTIONS[incident.status] ?? []
}

/** Actions that change the status; these ask for confirmation first. Notes, comments and questions do not. */
export function changesStatus(action: IncidentAction): boolean {
  return action !== 'addNote' && action !== 'comment' && action !== 'requestInfo'
}
