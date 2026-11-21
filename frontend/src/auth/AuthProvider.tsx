import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { login as loginRequest } from '@/api/auth'
import { setUnauthorizedHandler } from '@/api/client'
import type { UserResponse } from '@/api/types'
import { AuthContext, type AuthContextValue, type LogoutReason } from './authContext'
import { clearSession, readSession, saveSession, sessionFromLogin, type Session } from './session'

// setTimeout cannot wait longer than about 24.8 days (a 32-bit number of ms).
const MAX_TIMEOUT_MS = 2_147_483_647

/**
 * Holds the session in React state and shares it through AuthContext.
 * It must sit inside the router, because logging out navigates to /login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initial state: read sessionStorage once, on first render (so a reload stays logged in).
  const [session, setSession] = useState<Session | null>(() => readSession())
  const [lastLogoutReason, setLastLogoutReason] = useState<LogoutReason | null>(null)
  const [lastUserId, setLastUserId] = useState<string | null>(null)
  // endSession needs the *current* session's user. A ref always holds the latest value without
  // making endSession change on every login (which would re-register the 401 handler each time).
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const endSession = useCallback(
    (reason: LogoutReason) => {
      if (sessionRef.current !== null) setLastUserId(sessionRef.current.user.id)
      clearSession()
      setSession(null)
      setLastLogoutReason(reason)
      // Forget cached server data, so the next person on this tab never sees it.
      queryClient.clear()
      // On expiry we don't navigate: with user now null, RequireAuth redirects to /login and
      // remembers the current page, so signing in again returns there. (Navigating here as
      // well made two redirects race.) A deliberate sign-out starts fresh at /login.
      if (reason === 'signed-out') navigate('/login', { replace: true })
    },
    [navigate, queryClient],
  )

  // Any API call that gets a 401 (token rejected or expired) ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('expired'))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // Log out exactly when the token expires, even if no request is made.
  useEffect(() => {
    if (session === null) return
    const delay = Math.min(Math.max(session.expiresAtMs - Date.now(), 0), MAX_TIMEOUT_MS)
    const timer = setTimeout(() => endSession('expired'), delay)
    return () => clearTimeout(timer)
  }, [session, endSession])

  const login = useCallback(async (email: string, password: string): Promise<UserResponse> => {
    const response = await loginRequest(email, password)
    const newSession = sessionFromLogin(response)
    saveSession(newSession)
    setSession(newSession)
    setLastLogoutReason(null)
    return newSession.user
  }, [])

  const logout = useCallback(() => endSession('signed-out'), [endSession])

  // useMemo keeps the same object between renders, so consumers only re-render when it changes.
  const value = useMemo<AuthContextValue>(
    () => ({ user: session === null ? null : session.user, login, logout, lastLogoutReason, lastUserId }),
    [session, login, logout, lastLogoutReason, lastUserId],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
