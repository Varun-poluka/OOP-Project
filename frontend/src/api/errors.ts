import type { ProblemDetail } from './types'

/**
 * The one error type every API call throws. UI code only needs `message`
 * (already human-readable); `status` lets code react to specific cases (e.g. 404).
 * status 0 means the request never reached the server.
 */
export class ApiError extends Error {
  readonly status: number
  readonly title: string | undefined
  /**
   * Per-field validation messages from a 400, keyed by the backend field name,
   * e.g. { title: 'must not be blank' }. Empty when the error is not about fields.
   */
  readonly fieldErrors: Readonly<Record<string, string>>

  constructor(status: number, message: string, title?: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.fieldErrors = fieldErrors
  }
}

export const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Check that the backend is running.'

/** A fallback sentence for each kind of HTTP status, used when the body says nothing useful. */
export function messageForStatus(status: number): string {
  if (status === 400) return 'The request was not valid.'
  if (status === 401) return 'Your session has ended. Please sign in again.'
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return 'That item was not found.'
  if (status === 409) return 'That action is not allowed in the current state.'
  if (status >= 500) return 'Server error. Please try again later.'
  return `Request failed (HTTP ${status}).`
}

/**
 * The backend's validation handler joins field errors as
 * "title: must not be blank; serviceId: must not be null; ".
 * Returns them as { title: 'must not be blank', serviceId: 'must not be null' },
 * or null when the text does not look like that format.
 */
export function parseFieldErrors(detail: string): Record<string, string> | null {
  const parts = detail
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (parts.length === 0) return null

  const errors: Record<string, string> = {}
  for (const part of parts) {
    const match = /^([A-Za-z][A-Za-z0-9.]*): (.+)$/.exec(part)
    if (match === null) return null
    // If a field has two problems, keep the first; the form shows one message per field.
    if (!(match[1] in errors)) errors[match[1]] = match[2]
  }
  return errors
}

/** The same field errors as readable sentences: "Title: must not be blank. Service id: must not be null." */
export function formatValidationDetail(detail: string): string | null {
  const errors = parseFieldErrors(detail)
  if (errors === null) return null
  return Object.entries(errors)
    .map(([field, message]) => `${humaniseField(field)}: ${message}.`)
    .join(' ')
}

/** "serviceId" -> "Service id", "reporter.name" -> "Reporter name". */
function humaniseField(field: string): string {
  const spaced = field
    .replace(/\./g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Picks the most helpful message from an error response.
 * Order: validation detail (reformatted) -> detail -> title -> generic per status.
 */
export function toReadableMessage(status: number, problem: ProblemDetail | null): string {
  if (problem !== null) {
    const detail = typeof problem.detail === 'string' ? problem.detail.trim() : ''
    if (detail.length > 0) {
      if (status === 400) {
        const formatted = formatValidationDetail(detail)
        if (formatted !== null) return formatted
      }
      return detail
    }
    const title = typeof problem.title === 'string' ? problem.title.trim() : ''
    // Spring's default title is just the status phrase ("Forbidden"); our sentence is friendlier.
    if (title.length > 0 && !isDefaultStatusTitle(title)) return title
  }
  return messageForStatus(status)
}

const DEFAULT_TITLES = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Conflict',
  'Internal Server Error',
])

function isDefaultStatusTitle(title: string): boolean {
  return DEFAULT_TITLES.has(title)
}

/** Message for any thrown value, for components that show errors (ErrorState, toasts). */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message.length > 0) return error.message
  return 'Something went wrong.'
}
