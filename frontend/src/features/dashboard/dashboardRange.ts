import { addDays, isDateText, startOfDay, toDateText } from '@/lib/dates'

// The dashboard's date range lives in the URL as calendar dates (?from=2026-10-23&to=2026-11-21),
// both days included. A preset (7 / 30 / 90 days) is just a from/to pair ending today.

export const RANGE_PRESETS = [7, 30, 90] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]
export const DEFAULT_PRESET: RangePreset = 30

export type DateRange = {
  /** First day included, "YYYY-MM-DD". */
  from: string
  /** Last day included, "YYYY-MM-DD". */
  to: string
}

/** The last `days` days, today included: 7 days ending 21 Nov starts on 15 Nov. */
export function presetRange(days: number, todayMs: number): DateRange {
  const to = toDateText(todayMs)
  return { from: addDays(to, -(days - 1)), to }
}

/** Reads the range from the URL; a missing, malformed or backwards range falls back to the default preset. */
export function readRange(params: URLSearchParams, todayMs: number): DateRange {
  const from = params.get('from')
  const to = params.get('to')
  if (isDateText(from) && isDateText(to) && from <= to) return { from, to } // "YYYY-MM-DD" sorts as text
  return presetRange(DEFAULT_PRESET, todayMs)
}

export function writeRange(range: DateRange): URLSearchParams {
  return new URLSearchParams({ from: range.from, to: range.to })
}

/** Which preset the range matches (so its button shows as selected), or null for any other range. */
export function matchingPreset(range: DateRange, todayMs: number): RangePreset | null {
  for (const days of RANGE_PRESETS) {
    const preset = presetRange(days, todayMs)
    if (preset.from === range.from && preset.to === range.to) return days
  }
  return null
}

/**
 * The from/to for GET /api/reports/summary. The backend counts createdAt >= from and < to,
 * so to include the whole last day we send midnight at the start of the day after.
 */
export function toReportQuery(range: DateRange): { from: string; to: string } {
  return { from: startOfDay(range.from), to: startOfDay(addDays(range.to, 1)) }
}
