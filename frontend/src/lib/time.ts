import { parseBackendDateTime } from './sla'

/** "21 Nov 2026, 10:05" in the browser's locale; the input text itself if it is not a date. */
export function formatDateTime(value: string): string {
  const ms = parseBackendDateTime(value)
  if (Number.isNaN(ms)) return value
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** "just now", "5 min ago", "3 h ago", "2 d ago" — for timelines and notifications. */
export function formatRelative(value: string, nowMs: number): string {
  const ms = parseBackendDateTime(value)
  if (Number.isNaN(ms)) return value
  const minutes = Math.floor((nowMs - ms) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.floor(hours / 24)} d ago`
}
