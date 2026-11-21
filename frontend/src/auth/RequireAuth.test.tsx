import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { login } from '@/api/auth'
import type { LoginResponse, UserResponse } from '@/api/types'
import { saveSession } from '@/auth/session'
import { routes } from '@/router'

vi.mock('@/api/auth', () => ({ login: vi.fn() }))
const loginMock = vi.mocked(login)

const ALICE: UserResponse = { id: 'tech-alice', name: 'Alice Tech', email: 'alice@example.com', role: 'TECHNICIAN' }
const BOB: UserResponse = { id: 'tech-bob', name: 'Bob Tech', email: 'bob@example.com', role: 'TECHNICIAN' }

function loginAs(user: UserResponse): LoginResponse {
  return { token: 'fake-jwt', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user }
}

// No network in tests: lists are empty, the count is 0, the live stream never answers.
function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input)
  if (url.includes('/api/stream')) return new Promise<Response>(() => {})
  const body = url.includes('/api/notifications/unread-count') ? { unreadCount: 0 } : []
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  loginMock.mockReset()
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Alice is on /notifications when her session runs out; we end up on /login. */
async function aliceSessionExpiresOnNotifications() {
  saveSession({ token: 'fake-jwt', expiresAtMs: Date.now() + 300, user: ALICE })
  const router = createMemoryRouter(routes, { initialEntries: ['/notifications'] })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()
  await screen.findByText('Your session ended. Please sign in again.', {}, { timeout: 2000 })
  expect(router.state.location.pathname).toBe('/login')
  return router
}

async function signIn() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'someone@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('RequireAuth: returning to the previous page', () => {
  it('returns the same user to the page they were on', async () => {
    const router = await aliceSessionExpiresOnNotifications()
    loginMock.mockResolvedValue(loginAs(ALICE))

    await signIn()

    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/notifications')
  })

  it("sends a different user to their own home, not the previous user's page", async () => {
    const router = await aliceSessionExpiresOnNotifications()
    loginMock.mockResolvedValue(loginAs(BOB))

    await signIn()

    expect(await screen.findByRole('heading', { level: 1, name: 'My queue' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/queue')
  })
})
