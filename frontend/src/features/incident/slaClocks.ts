import type { IncidentResponse } from '@/api/types'
import { parseBackendDateTime, slaCountdown, type SlaState } from '@/lib/sla'

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

export type UrgentClock = {
  /** Which clock the label is about; null when no clock is running. */
  kind: 'response' | 'resolution' | null
  state: SlaState
  /** "Respond in 3m", "Resolve in 4h 11m", "Breached" or "No SLA". */
  label: string
}

/**
 * The single running SLA clock that matters most, for one-column lists like the queue.
 * A clock is running from creation until the work it measures happens (see responseClock /
 * resolutionClock). Any running clock that is breached wins ("Breached"); otherwise the one
 * with the least time left. Pure: pass the time in, so tests can pick any moment.
 */
export function mostUrgentClock(incident: ClockFields, nowMs: number): UrgentClock {
  const running = [responseClock(incident), resolutionClock(incident)].filter(
    (clock) => clock.dueAt !== null && clock.stoppedAt === null,
  )

  let best: { kind: ClockInput['kind']; remainingMs: number; state: SlaState; text: string } | null = null
  for (const clock of running) {
    const countdown = slaCountdown(clock.dueAt, nowMs, clock.breached)
    if (countdown.state === 'none' || countdown.remainingMs === null) continue // unreadable date
    if (countdown.state === 'breached') return { kind: clock.kind, state: 'breached', label: 'Breached' }
    if (best === null || countdown.remainingMs < best.remainingMs) {
      best = { kind: clock.kind, remainingMs: countdown.remainingMs, state: countdown.state, text: countdown.label }
    }
  }

  if (best === null) return { kind: null, state: 'none', label: 'No SLA' }
  const verb = best.kind === 'response' ? 'Respond' : 'Resolve'
  return { kind: best.kind, state: best.state, label: `${verb} in ${best.text}` }
}

/**
 * How long past its deadline the most overdue *running* clock is, in ms; null when no running
 * clock is past due. Stopped clocks don't count: their lateness is fixed history, not "overdue".
 */
export function runningOverdueMs(incident: ClockFields, nowMs: number): number | null {
  let worst: number | null = null
  for (const clock of [responseClock(incident), resolutionClock(incident)]) {
    if (clock.dueAt === null || clock.stoppedAt !== null) continue
    const overdue = nowMs - parseBackendDateTime(clock.dueAt)
    if (Number.isNaN(overdue) || overdue <= 0) continue
    if (worst === null || overdue > worst) worst = overdue
  }
  return worst
}
