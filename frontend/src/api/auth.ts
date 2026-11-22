import { apiFetch } from './client'
import type { LoginResponse, RegisterRequest, UserResponse } from './types'

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

/** POST /api/auth/register: creates an employee account (no token; log in afterwards). 409 if the email is taken. */
export function register(request: RegisterRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/auth/register', { method: 'POST', body: request, skipUnauthorizedHandler: true })
}
