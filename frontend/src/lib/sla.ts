// Time-left logic for SLA deadlines. Pure functions: "now" is passed in, so tests can
// use any moment without waiting or faking the clock.

export type SlaState = 'none' | 'ok' | 'warning' | 'breached'

export type SlaCountdown = {
  state: SlaState
  /** Short text for the badge: "2d 4h", "3h 12m", "8m", "<1m", "Breached", "No SLA". */
  label: string
  /** Milliseconds left (negative once past due); null when there is no deadline. */
  remainingMs: number | null
}

/** Less than this much time left shows as a warning. */
export const SLA_WARNING_MS = 60 * 60 * 1000

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/**
 * Parses a backend LocalDateTime ("2026-11-21T10:00:00" or with up to 9 fractional digits).
 * It has no timezone, so it is read as the browser's local time (same as the server's
 * while both run on one machine). Returns NaN if the text is not a date.
 */
export function parseBackendDateTime(value: string): number {
  // JavaScript dates only understand milliseconds; Java may send nanoseconds. Keep 3 digits.
  const trimmed = value.replace(/(\.\d{3})\d+/, '$1')
  return Date.parse(trimmed)
}

/** Formats a positive duration as the two largest units: "2d 4h", "3h 12m", "8m", "<1m". */
export function formatDuration(ms: number): string {
  if (ms < MINUTE_MS) return '<1m'
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * @param dueAt     the deadline from the backend (responseDueAt / resolutionDueAt), or null
 * @param nowMs     the current time in epoch ms (Date.now())
 * @param breached  the backend's *Breached flag; when true the result is always "Breached"
 */
export function slaCountdown(dueAt: string | null, nowMs: number, breached = false): SlaCountdown {
  if (breached) {
    const dueMs = dueAt === null ? NaN : parseBackendDateTime(dueAt)
    return { state: 'breached', label: 'Breached', remainingMs: Number.isNaN(dueMs) ? null : dueMs - nowMs }
  }
  if (dueAt === null) return { state: 'none', label: 'No SLA', remainingMs: null }

  const dueMs = parseBackendDateTime(dueAt)
  if (Number.isNaN(dueMs)) return { state: 'none', label: 'No SLA', remainingMs: null }

  const remainingMs = dueMs - nowMs
  // Due exactly now counts as breached: the backend treats "at or before the deadline" as met,
  // but by the time anyone reads this the moment has passed.
  if (remainingMs <= 0) return { state: 'breached', label: 'Breached', remainingMs }
  if (remainingMs < SLA_WARNING_MS) return { state: 'warning', label: formatDuration(remainingMs), remainingMs }
  return { state: 'ok', label: formatDuration(remainingMs), remainingMs }
}

export type SlaClock =
  | { phase: 'running'; countdown: SlaCountdown }
  | { phase: 'met'; label: string }
  | { phase: 'missed'; label: string }
  | { phase: 'none'; label: string }

/**
 * One SLA clock (response or resolution) of an incident.
 * The clock stops when the work it measures happens: response at acknowledgedAt,
 * resolution at resolvedAt. Before that it counts down; after, it is met or missed.
 *
 * @param dueAt      responseDueAt / resolutionDueAt
 * @param stoppedAt  acknowledgedAt / resolvedAt (null while still running)
 * @param breached   responseBreached / resolutionBreached from the backend
 */
export function slaClock(
  dueAt: string | null,
  stoppedAt: string | null,
  breached: boolean,
  nowMs: number,
): SlaClock {
  if (dueAt === null) return { phase: 'none', label: 'No SLA' }
  if (stoppedAt === null) return { phase: 'running', countdown: slaCountdown(dueAt, nowMs, breached) }

  // Stopped: "met" means done at or before the deadline (the backend's rule), unless it flagged a breach.
  const dueMs = parseBackendDateTime(dueAt)
  const stoppedMs = parseBackendDateTime(stoppedAt)
  if (breached || (!Number.isNaN(dueMs) && !Number.isNaN(stoppedMs) && stoppedMs > dueMs)) {
    return { phase: 'missed', label: 'Missed' }
  }
  return { phase: 'met', label: 'Met' }
}
