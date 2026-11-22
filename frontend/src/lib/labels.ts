import type { Impact, IncidentStatus, Priority, RiskLevel } from '@/api/types'

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

export const RISK_LABEL: Record<RiskLevel, string> = {
  NONE: 'No risk',
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
  BREACHED: 'Breached',
}

/** Impact and Urgency share the same three values. */
export const LEVEL_LABEL: Record<Impact, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

/** ITService.businessCriticality is 1..3. */
export function criticalityLabel(value: number): string {
  if (value >= 3) return 'Critical'
  if (value === 2) return 'Important'
  return 'Standard'
}

/** "PRIORITY_RAISED" -> "Priority raised"; "SLA_RESPONSE_BREACHED" -> "SLA response breached". */
export function humaniseAction(action: string): string {
  const words = action.replace(/_/g, ' ').toLowerCase()
  const sentence = words.charAt(0).toUpperCase() + words.slice(1)
  // Lower-casing turned the acronym into "Sla"; put it back.
  return sentence.replace(/\bsla\b/gi, 'SLA')
}
