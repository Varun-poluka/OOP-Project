import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { login } from '@/api/auth'
import { ApiError } from '@/api/errors'
import type { LoginResponse, Role } from '@/api/types'
import { readSession, saveSession } from '@/auth/session'
import { routes } from '@/router'

// Replace the real login request with a fake we control in each test.
vi.mock('@/api/auth', () => ({ login: vi.fn() }))
const loginMock = vi.mocked(login)

function loginResponse(role: Role): LoginResponse {
  return {
    token: 'fake-jwt',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 'u1', name: 'Test User', email: 'test@example.com', role },
  }
}

/** Renders the real app routes in memory, starting at `path`. */
function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

async function signIn() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

// The app shell and pages load data (notifications, incident lists). Tests must never touch
// the network, so fetch answers with empty data: [] for lists, an empty page for search.
function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input)
  const body = url.includes('/api/incidents/search')
    ? { content: [], page: 0, size: 15, totalElements: 0, totalPages: 0 }
    : []
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  loginMock.mockReset()
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('role redirect after login', () => {
  it.each([
    ['EMPLOYEE', '/incidents/mine', 'My incidents'],
    ['TECHNICIAN', '/queue', 'My queue'],
    ['ADMIN', '/admin', 'Dashboard'],
  ] as const)('sends %s to %s', async (role, path, heading) => {
    loginMock.mockResolvedValue(loginResponse(role))
    const router = renderApp('/login')

    await signIn()

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(path)
  })

  it('returns to the page that required login when the role may see it', async () => {
    loginMock.mockResolvedValue(loginResponse('ADMIN'))
    const router = renderApp('/admin/sla')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()

    await signIn()

    expect(await screen.findByRole('heading', { level: 1, name: 'SLA policies' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/sla')
  })

  it('goes home instead when the requested page is not for that role', async () => {
    loginMock.mockResolvedValue(loginResponse('EMPLOYEE'))
    const router = renderApp('/admin/sla')

    await signIn()

    expect(await screen.findByRole('heading', { level: 1, name: 'My incidents' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/incidents/mine')
  })

  it('sends a logged-in user away from a page of another role', async () => {
    loginMock.mockResolvedValue(loginResponse('TECHNICIAN'))
    const router = renderApp('/login')
    await signIn()
    await screen.findByRole('heading', { level: 1, name: 'My queue' })

    // act() lets React finish the re-render (and RequireAuth's redirect) before we look.
    await act(() => router.navigate('/admin'))

    expect(await screen.findByRole('heading', { level: 1, name: 'My queue' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/queue')
  })

  it('shows the error and stays on /login when login fails', async () => {
    loginMock.mockRejectedValue(new ApiError(401, 'Invalid email or password'))
    const router = renderApp('/login')

    await signIn()

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('session expiry', () => {
  it('logs out when expiresAt passes, explains why, and returns to the page after login', async () => {
    saveSession({
      token: 'fake-jwt',
      expiresAtMs: Date.now() + 300,
      user: { id: 'u1', name: 'Test User', email: 'test@example.com', role: 'TECHNICIAN' },
    })
    const router = renderApp('/notifications')
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()

    expect(await screen.findByText('Your session ended. Please sign in again.', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(readSession()).toBeNull()

    loginMock.mockResolvedValue(loginResponse('TECHNICIAN'))
    await signIn()
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()
  })
})
