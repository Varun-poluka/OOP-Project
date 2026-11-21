import { describe, expect, it } from 'vitest'
import { matchingPreset, presetRange, readRange, toReportQuery, writeRange } from './dashboardRange'

// 21 Nov 2026, 15:30 local time.
const TODAY = new Date(2026, 10, 21, 15, 30).getTime()

describe('dashboard range', () => {
  it('a 7-day preset is the last 7 calendar days including today', () => {
    expect(presetRange(7, TODAY)).toEqual({ from: '2026-11-15', to: '2026-11-21' })
  })

  it('a 30-day preset crosses into the previous month', () => {
    expect(presetRange(30, TODAY)).toEqual({ from: '2026-10-23', to: '2026-11-21' })
  })

  it('defaults to 30 days when the URL has no range', () => {
    expect(readRange(new URLSearchParams(), TODAY)).toEqual(presetRange(30, TODAY))
  })

  it('falls back to the default for malformed or backwards ranges', () => {
    expect(readRange(new URLSearchParams('from=2026-11-10&to=nope'), TODAY)).toEqual(presetRange(30, TODAY))
    expect(readRange(new URLSearchParams('from=2026-11-10&to=2026-11-01'), TODAY)).toEqual(presetRange(30, TODAY))
  })

  it('round-trips a custom range through the URL', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' }
    expect(readRange(writeRange(range), TODAY)).toEqual(range)
  })

  it('knows which preset a range matches', () => {
    expect(matchingPreset(presetRange(90, TODAY), TODAY)).toBe(90)
    expect(matchingPreset({ from: '2026-09-01', to: '2026-09-30' }, TODAY)).toBeNull()
  })

  it('sends the backend an exclusive end: midnight after the last day', () => {
    expect(toReportQuery({ from: '2026-11-15', to: '2026-11-21' })).toEqual({
      from: '2026-11-15T00:00:00',
      to: '2026-11-22T00:00:00',
    })
  })
})
