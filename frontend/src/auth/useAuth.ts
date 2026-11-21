import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'

/** A custom hook: any component can call useAuth() to read the user or log in/out. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
