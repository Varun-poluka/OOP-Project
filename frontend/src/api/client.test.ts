import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, saveSession } from '@/auth/session'
import { apiFetch, buildUrl, setUnauthorizedHandler } from './client'
import { ApiError, NETWORK_ERROR_MESSAGE } from './errors'

// fetch is replaced by a fake (vi.fn) so no real server is needed.
const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(status: number, body: unknown, contentType = 'application/problem+json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

function logIn() {
  saveSession({
    token: 'test-token',
    expiresAtMs: Date.now() + 60 * 60 * 1000,
    user: { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', role: 'EMPLOYEE' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setUnauthorizedHandler(null)
})

/** Runs the call and returns what it threw (fails the test if it did not throw). */
async function catchError(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected the call to throw')
}

describe('apiFetch', () => {
  it('adds the Bearer token when logged in', async () => {
    logIn()
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }, 'application/json'))

    await apiFetch('/api/incidents')

    const init = fetchMock.mock.calls[0][1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
  })

  it('sends no Authorization header when logged out', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [], 'application/json'))

    await apiFetch('/api/health')

    const init = fetchMock.mock.calls[0][1]!
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('sends a JSON body and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'INC-1' }, 'application/json'))

    const result = await apiFetch<{ id: string }>('/api/incidents', { method: 'POST', body: { title: 'x' } })

    expect(result).toEqual({ id: 'INC-1' })
    const init = fetchMock.mock.calls[0][1]!
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"title":"x"}')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('turns a ProblemDetail into an ApiError with a readable message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { title: 'Conflict', status: 409, detail: 'Cannot resolve an incident in state NEW' }),
    )

    const error = await catchError(apiFetch('/api/incidents/INC-1/resolve', { method: 'PATCH', body: {} }))

    expect(error.status).toBe(409)
    expect(error.message).toBe('Cannot resolve an incident in state NEW')
  })

  it('handles an error response whose body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

    const error = await catchError(apiFetch('/api/incidents'))

    expect(error.status).toBe(502)
    expect(error.message).toBe('Server error. Please try again later.')
  })

  it('reports a network failure as status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await catchError(apiFetch('/api/incidents'))

    expect(error.status).toBe(0)
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE)
  })

  it('on 401 clears the session and calls the unauthorized handler', async () => {
    logIn()
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(jsonResponse(401, { title: 'Unauthorized', status: 401 }))

    const error = await catchError(apiFetch('/api/incidents'))

    expect(error.status).toBe(401)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('on 401 with skipUnauthorizedHandler (login) does not log out', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(jsonResponse(401, { status: 401, detail: 'Invalid email or password' }))

    const error = await catchError(
      apiFetch('/api/auth/login', { method: 'POST', body: {}, skipUnauthorizedHandler: true }),
    )

    expect(error.message).toBe('Invalid email or password')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('returns undefined for an empty 2xx body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiFetch('/api/notifications/1/read', { method: 'PATCH' })).resolves.toBeUndefined()
  })
})

describe('buildUrl', () => {
  it('skips empty query values and encodes the rest', () => {
    const url = buildUrl('/api/incidents/search', { status: 'NEW', text: 'vpn drops', priority: undefined, page: 0 })
    expect(url).toBe('http://localhost:8080/api/incidents/search?status=NEW&text=vpn+drops&page=0')
  })
})
