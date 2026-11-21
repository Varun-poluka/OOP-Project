// Calendar dates as "YYYY-MM-DD" text, the format of <input type="date"> and of our URLs.
// All in the browser's local time, like the backend's LocalDateTime values.

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** The local calendar date of `ms`, e.g. "2026-11-21". */
export function toDateText(ms: number): string {
  const date = new Date(ms)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** True for a real calendar date in "YYYY-MM-DD" form ("2026-02-30" is false). */
export function isDateText(value: string | null): value is string {
  if (value === null) return false
  const match = DATE_PATTERN.exec(value)
  if (match === null) return false
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toDateText(date.getTime()) === value
}

/** `days` calendar days after (or before, if negative) a date. */
export function addDays(dateText: string, days: number): string {
  const [year, month, day] = dateText.split('-').map(Number)
  // The Date constructor rolls over month ends: 31 Oct + 1 day = 1 Nov.
  return toDateText(new Date(year, month - 1, day + days).getTime())
}

/** Midnight at the start of a date, as a backend LocalDateTime: "2026-11-21T00:00:00". */
export function startOfDay(dateText: string): string {
  return `${dateText}T00:00:00`
}

/** The local date and time of `ms` as <input type="datetime-local"> text: "2026-11-21T14:30". */
export function toDateTimeLocalText(ms: number): string {
  const date = new Date(ms)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${toDateText(ms)}T${hours}:${minutes}`
}
