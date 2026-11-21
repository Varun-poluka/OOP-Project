import { describe, expect, it } from 'vitest'
import { SESSION_KEY, readSession, saveSession, sessionFromLogin } from './session'

const user = { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', role: 'ADMIN' as const }

describe('session storage', () => {
  it('reads back a saved, unexpired session', () => {
    const session = { token: 't', expiresAtMs: Date.now() + 60_000, user }
    saveSession(session)
    expect(readSession()).toEqual(session)
  })

  it('discards an expired session', () => {
    saveSession({ token: 't', expiresAtMs: 1_000, user })
    expect(readSession(2_000)).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('discards damaged data', () => {
    sessionStorage.setItem(SESSION_KEY, '{"token":"t","expiresAtMs":9e15,"user":{"role":"ROOT"}}')
    expect(readSession()).toBeNull()
    sessionStorage.setItem(SESSION_KEY, 'not json')
    expect(readSession()).toBeNull()
  })

  it('converts the login response Instant to epoch ms', () => {
    const session = sessionFromLogin({ token: 't', expiresAt: '2026-11-21T10:00:00Z', user })
    expect(session.expiresAtMs).toBe(Date.UTC(2026, 10, 21, 10, 0, 0))
  })
})
