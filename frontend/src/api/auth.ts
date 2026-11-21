import { apiFetch } from './client'
import type { LoginResponse, UserResponse } from './types'

/** POST /api/auth/login. A wrong password comes back as an ApiError (401), not a logout. */
export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    skipUnauthorizedHandler: true,
  })
}

/** GET /api/auth/me: the user the current token belongs to. */
export function fetchMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/auth/me')
}
