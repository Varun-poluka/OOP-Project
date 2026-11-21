import type { IncidentResponse } from '@/api/types'

export type ClockInput = {
  kind: 'response' | 'resolution'
  dueAt: string | null
  /** When the clock stopped: acknowledgedAt (response) or resolvedAt (resolution). */
  stoppedAt: string | null
  breached: boolean
}

type ClockFields = Pick<
  IncidentResponse,
  | 'responseDueAt'
  | 'resolutionDueAt'
  | 'acknowledgedAt'
  | 'resolvedAt'
  | 'responseBreached'
  | 'resolutionBreached'
>

export function responseClock(incident: ClockFields): ClockInput {
  return {
    kind: 'response',
    dueAt: incident.responseDueAt,
    stoppedAt: incident.acknowledgedAt,
    breached: incident.responseBreached,
  }
}

export function resolutionClock(incident: ClockFields): ClockInput {
  return {
    kind: 'resolution',
    dueAt: incident.resolutionDueAt,
    stoppedAt: incident.resolvedAt,
    breached: incident.resolutionBreached,
  }
}

/** For one-column lists: the response clock until someone acknowledges, then the resolution clock. */
export function currentClock(incident: ClockFields): ClockInput {
  return incident.acknowledgedAt === null && incident.resolvedAt === null
    ? responseClock(incident)
    : resolutionClock(incident)
}
