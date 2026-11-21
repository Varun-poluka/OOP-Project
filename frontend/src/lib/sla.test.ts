import { describe, expect, it } from 'vitest'
import { formatDuration, parseBackendDateTime, slaClock, slaCountdown } from './sla'

// A fixed "now" so results never depend on when the test runs. Local time, like the backend.
const NOW = new Date(2026, 10, 21, 12, 0, 0).getTime() // 21 Nov 2026, 12:00:00
const MIN = 60_000

/** The LocalDateTime string the backend would send for NOW + minutes. */
function dueIn(minutes: number): string {
  const d = new Date(NOW + minutes * MIN)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

describe('slaCountdown', () => {
  it('shows time left when the deadline is far away', () => {
    const result = slaCountdown(dueIn(3 * 60 + 12), NOW)
    expect(result.state).toBe('ok')
    expect(result.label).toBe('3h 12m')
    expect(result.remainingMs).toBe((3 * 60 + 12) * MIN)
  })

  it('warns when less than an hour is left', () => {
    expect(slaCountdown(dueIn(59), NOW)).toMatchObject({ state: 'warning', label: '59m' })
    expect(slaCountdown(dueIn(60), NOW).state).toBe('ok') // exactly one hour is not a warning yet
  })

  it('is breached at the deadline and after it', () => {
    expect(slaCountdown(dueIn(0), NOW)).toMatchObject({ state: 'breached', label: 'Breached' })
    expect(slaCountdown(dueIn(-30), NOW)).toMatchObject({ state: 'breached', label: 'Breached', remainingMs: -30 * MIN })
  })

  it('is breached when the backend says so, even if time is left', () => {
    expect(slaCountdown(dueIn(120), NOW, true)).toMatchObject({ state: 'breached', label: 'Breached' })
  })

  it('shows "No SLA" without a deadline or with an unreadable one', () => {
    expect(slaCountdown(null, NOW)).toEqual({ state: 'none', label: 'No SLA', remainingMs: null })
    expect(slaCountdown('not a date', NOW).state).toBe('none')
  })

  it('accepts nanosecond precision from Java', () => {
    const result = slaCountdown('2026-11-21T12:30:00.123456789', NOW)
    expect(result).toMatchObject({ state: 'warning', label: '30m' })
  })

  it('crosses midnight and days correctly', () => {
    expect(slaCountdown(dueIn(2 * 24 * 60 + 4 * 60 + 59), NOW).label).toBe('2d 4h')
  })
})

describe('formatDuration', () => {
  it('uses the two largest units', () => {
    expect(formatDuration(30_000)).toBe('<1m')
    expect(formatDuration(8 * MIN)).toBe('8m')
    expect(formatDuration(61 * MIN)).toBe('1h 1m')
    expect(formatDuration(24 * 60 * MIN)).toBe('1d 0h')
  })
})

describe('parseBackendDateTime', () => {
  it('reads a LocalDateTime as local time', () => {
    expect(parseBackendDateTime('2026-11-21T12:00:00')).toBe(NOW)
  })
})

describe('slaClock', () => {
  it('counts down while the clock runs', () => {
    const clock = slaClock(dueIn(90), null, false, NOW)
    expect(clock.phase).toBe('running')
    if (clock.phase === 'running') expect(clock.countdown.label).toBe('1h 30m')
  })

  it('is met when stopped at or before the deadline', () => {
    expect(slaClock(dueIn(30), dueIn(10), false, NOW)).toEqual({ phase: 'met', label: 'Met' })
    expect(slaClock(dueIn(30), dueIn(30), false, NOW).phase).toBe('met')
  })

  it('is missed when stopped after the deadline, or when the backend flagged a breach', () => {
    expect(slaClock(dueIn(30), dueIn(31), false, NOW).phase).toBe('missed')
    expect(slaClock(dueIn(30), dueIn(10), true, NOW).phase).toBe('missed')
  })

  it('has no clock without a deadline', () => {
    expect(slaClock(null, null, false, NOW)).toEqual({ phase: 'none', label: 'No SLA' })
  })
})
