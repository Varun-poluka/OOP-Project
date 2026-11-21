import type { IncidentStatus, Priority } from '@/api/types'

// Display text for enum values, kept in one place so every screen says the same thing.

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  NEW: 'New',
  CLASSIFIED: 'Classified',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
}

/** The four phases of the lifecycle; StatusBadge colours its dot by phase, not by each status. */
export type StatusPhase = 'intake' | 'active' | 'resolved' | 'closed'

export const STATUS_PHASE: Record<IncidentStatus, StatusPhase> = {
  NEW: 'intake',
  CLASSIFIED: 'intake',
  ASSIGNED: 'active',
  ACKNOWLEDGED: 'active',
  IN_PROGRESS: 'active',
  RESOLVED: 'resolved',
  VERIFIED: 'resolved',
  CLOSED: 'closed',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
}
