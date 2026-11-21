import { createContext } from 'react'
import type { UserResponse } from '@/api/types'

export type LogoutReason = 'expired' | 'signed-out'

export type AuthContextValue = {
  /** The logged-in user, or null when nobody is logged in. */
  user: UserResponse | null
  /** Calls the login endpoint, stores the session and returns the user. Throws ApiError on failure. */
  login: (email: string, password: string) => Promise<UserResponse>
  logout: () => void
  /** Why the last session ended (null if none ended yet in this tab); the login page shows it. */
  lastLogoutReason: LogoutReason | null
}

// null default: useAuth() throws if a component is used outside <AuthProvider>.
export const AuthContext = createContext<AuthContextValue | null>(null)
