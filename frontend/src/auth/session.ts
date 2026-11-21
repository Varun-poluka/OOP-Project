import { ROLES, type LoginResponse, type Role, type UserResponse } from '@/api/types'

// The session is what the login endpoint returned. It lives in sessionStorage:
// it survives a page reload but is forgotten when the tab is closed, and other
// tabs do not see it. See docs/learning-log-frontend.md for the trade-off.

export type Session = {
  token: string
  /** Epoch milliseconds when the token stops being valid (parsed from the Instant string). */
  expiresAtMs: number
  user: UserResponse
}

export const SESSION_KEY = 'itsm.session'

export function sessionFromLogin(response: LoginResponse): Session {
  const expiresAtMs = Date.parse(response.expiresAt)
  if (Number.isNaN(expiresAtMs)) throw new Error('Login response has an invalid expiresAt')
  return { token: response.token, expiresAtMs, user: response.user }
}

export function isExpired(session: Session, nowMs: number): boolean {
  return nowMs >= session.expiresAtMs
}

/**
 * Returns the stored session, or null when there is none, it is damaged, or it has expired.
 * A damaged or expired session is removed so it is not read again.
 */
export function readSession(nowMs: number = Date.now()): Session | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null // storage blocked (e.g. strict privacy mode)
  }
  if (raw === null) return null

  const session = parseSession(raw)
  if (session === null || isExpired(session, nowMs)) {
    clearSession()
    return null
  }
  return session
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // If storage is blocked the user stays logged in for this page only.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // nothing to clear
  }
}

/** Checks every field, because sessionStorage can hold anything (old versions, manual edits). */
function parseSession(raw: string): Session | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (value === null || typeof value !== 'object') return null
  const candidate = value as Partial<Session>
  if (typeof candidate.token !== 'string' || candidate.token.length === 0) return null
  if (typeof candidate.expiresAtMs !== 'number') return null
  const user = candidate.user
  if (user === undefined || user === null || typeof user !== 'object') return null
  if (typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string') return null
  if (!isRole(user.role)) return null
  return { token: candidate.token, expiresAtMs: candidate.expiresAtMs, user }
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}
