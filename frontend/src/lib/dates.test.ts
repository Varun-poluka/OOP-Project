import { describe, expect, it } from 'vitest'
import { addDays, isDateText, startOfDay, toDateText, toDateTimeLocalText } from './dates'

describe('dates', () => {
  const ms = new Date(2026, 10, 21, 9, 5).getTime() // 21 Nov 2026, 09:05 local

  it('formats a moment as a local date and as datetime-local text', () => {
    expect(toDateText(ms)).toBe('2026-11-21')
    expect(toDateTimeLocalText(ms)).toBe('2026-11-21T09:05')
  })

  it('accepts only real calendar dates', () => {
    expect(isDateText('2026-11-21')).toBe(true)
    expect(isDateText('2026-02-30')).toBe(false)
    expect(isDateText('21/11/2026')).toBe(false)
    expect(isDateText(null)).toBe(false)
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('gives midnight as a backend LocalDateTime', () => {
    expect(startOfDay('2026-11-21')).toBe('2026-11-21T00:00:00')
  })
})
