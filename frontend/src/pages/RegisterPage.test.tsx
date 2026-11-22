import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { login, register } from '@/api/auth'
import { ApiError } from '@/api/errors'
import { clearSession } from '@/auth/session'
import { AuthProvider } from '@/auth/AuthProvider'
import { RegisterPage } from './RegisterPage'

vi.mock('@/api/auth', () => ({ login: vi.fn(), register: vi.fn() }))
const loginMock = vi.mocked(login)
const registerMock = vi.mocked(register)

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/incidents/mine" element={<h1>My incidents</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fill(user: ReturnType<typeof userEvent.setup>, confirm = 'password123') {
  await user.type(screen.getByLabelText('Full name'), 'Nikhil Joshi')
  await user.type(screen.getByLabelText('Work email'), 'Nikhil.Joshi@itsm.local')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.type(screen.getByLabelText('Confirm password'), confirm)
}

beforeEach(() => {
  clearSession()
  loginMock.mockReset()
  registerMock.mockReset()
})

describe('RegisterPage', () => {
  it('shows a message under each field and sends nothing when the form is empty', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Enter your work email.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('catches passwords that do not match', async () => {
    const user = userEvent.setup()
    renderPage()
    await fill(user, 'password124')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('registers, signs in and goes to My incidents', async () => {
    registerMock.mockResolvedValue({ id: 'U-EMP-9', name: 'Nikhil Joshi', email: 'nikhil.joshi@itsm.local', role: 'EMPLOYEE', active: true })
    loginMock.mockResolvedValue({
      token: 'fake-jwt',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      user: { id: 'U-EMP-9', name: 'Nikhil Joshi', email: 'nikhil.joshi@itsm.local', role: 'EMPLOYEE' },
    })
    const user = userEvent.setup()
    renderPage()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'My incidents' })).toBeInTheDocument()
    expect(registerMock).toHaveBeenCalledWith({ name: 'Nikhil Joshi', email: 'nikhil.joshi@itsm.local', password: 'password123' })
    expect(loginMock).toHaveBeenCalledWith('nikhil.joshi@itsm.local', 'password123')
  })

  it('puts "already exists" under the email field on a 409', async () => {
    registerMock.mockRejectedValue(new ApiError(409, 'An account with email nikhil.joshi@itsm.local already exists'))
    const user = userEvent.setup()
    renderPage()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists. Sign in instead.')).toBeInTheDocument()
    expect(screen.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true')
    expect(loginMock).not.toHaveBeenCalled()
  })
})
