import { describe, expect, it } from 'vitest'
import { mostUrgentClock } from './slaClocks'

// "Now" for every test; the backend sends LocalDateTime strings without a timezone.
const NOW = new Date(2026, 10, 21, 10, 0, 0).getTime()

/** A local date-time string `minutes` from NOW, in the backend's format. */
function at(minutes: number): string {
  const d = new Date(NOW + minutes * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

const base = {
  responseDueAt: null as string | null,
  resolutionDueAt: null as string | null,
  acknowledgedAt: null as string | null,
  resolvedAt: null as string | null,
  responseBreached: false,
  resolutionBreached: false,
}

describe('mostUrgentClock', () => {
  it('shows the response clock while it is the sooner one', () => {
    const clock = mostUrgentClock({ ...base, responseDueAt: at(3), resolutionDueAt: at(240) }, NOW)
    expect(clock).toEqual({ kind: 'response', state: 'warning', label: 'Respond in 3m' })
  })

  it('switches to the resolution clock once acknowledged', () => {
    const clock = mostUrgentClock(
      { ...base, responseDueAt: at(3), acknowledgedAt: at(-1), resolutionDueAt: at(251) },
      NOW,
    )
    expect(clock).toEqual({ kind: 'resolution', state: 'ok', label: 'Resolve in 4h 11m' })
  })

  it('picks the resolution clock if it is due sooner than the response clock', () => {
    const clock = mostUrgentClock({ ...base, responseDueAt: at(90), resolutionDueAt: at(30) }, NOW)
    expect(clock.label).toBe('Resolve in 30m')
  })

  it('says Breached when the backend flagged a running clock', () => {
    const clock = mostUrgentClock(
      { ...base, responseDueAt: at(10), resolutionDueAt: at(240), responseBreached: true },
      NOW,
    )
    expect(clock).toEqual({ kind: 'response', state: 'breached', label: 'Breached' })
  })

  it('says Breached once a running deadline has passed, even before the backend flags it', () => {
    const clock = mostUrgentClock(
      { ...base, responseDueAt: at(-60), acknowledgedAt: at(-50), resolutionDueAt: at(-1) },
      NOW,
    )
    expect(clock).toEqual({ kind: 'resolution', state: 'breached', label: 'Breached' })
  })

  it('ignores a stopped clock that was missed', () => {
    // Acknowledged late (response breached), but the resolution clock is fine.
    const clock = mostUrgentClock(
      { ...base, responseDueAt: at(-60), acknowledgedAt: at(-30), responseBreached: true, resolutionDueAt: at(120) },
      NOW,
    )
    expect(clock.label).toBe('Resolve in 2h 0m')
  })

  it('says No SLA when no clock is running', () => {
    expect(mostUrgentClock(base, NOW)).toEqual({ kind: null, state: 'none', label: 'No SLA' })
    expect(
      mostUrgentClock({ ...base, responseDueAt: at(-60), acknowledgedAt: at(-70), resolutionDueAt: at(10), resolvedAt: at(-5) }, NOW).label,
    ).toBe('No SLA')
  })
})
