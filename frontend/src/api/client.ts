import { clearSession, readSession } from '@/auth/session'
import { ApiError, NETWORK_ERROR_MESSAGE, parseFieldErrors, toReadableMessage } from './errors'
import type { ProblemDetail } from './types'

/** Backend base URL. Set VITE_API_URL in .env to override (Vite exposes only VITE_* vars). */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

type QueryValue = string | number | boolean | null | undefined

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Sent as JSON. */
  body?: unknown
  /** Added to the URL as ?key=value; null/undefined/'' values are skipped. */
  query?: Record<string, QueryValue>
  /**
   * When true, a 401 is returned to the caller as an ApiError instead of logging out.
   * The login call uses this: a wrong password is a 401 too, and should show inline.
   */
  skipUnauthorizedHandler?: boolean
  signal?: AbortSignal
}

// The AuthProvider registers what "log out and go to /login" means. Keeping it as a
// callback means this file needs no React or router imports and stays easy to test.
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL)
  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Calls the backend and returns the parsed JSON body as T.
 * Every failure becomes an ApiError with a readable message.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const session = readSession()
  if (session !== null) headers.Authorization = `Bearer ${session.token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    // A cancelled request (component unmounted) is not a real failure; let it through as-is.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    const fieldErrors =
      response.status === 400 && typeof problem?.detail === 'string' ? parseFieldErrors(problem.detail) : null
    const apiError = new ApiError(
      response.status,
      toReadableMessage(response.status, problem),
      problem?.title,
      fieldErrors ?? {},
    )
    if (response.status === 401 && options.skipUnauthorizedHandler !== true) {
      clearSession()
      if (unauthorizedHandler !== null) unauthorizedHandler()
    }
    throw apiError
  }

  // 204 No Content (or any empty body) has nothing to parse.
  const text = await response.text()
  if (text.length === 0) return undefined as T
  return JSON.parse(text) as T
}

/** Reads a ProblemDetail body if there is one; returns null for empty or non-JSON bodies. */
async function readProblem(response: Response): Promise<ProblemDetail | null> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return null
  }
  if (text.length === 0) return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed !== null && typeof parsed === 'object') return parsed as ProblemDetail
    return null
  } catch {
    return null
  }
}
