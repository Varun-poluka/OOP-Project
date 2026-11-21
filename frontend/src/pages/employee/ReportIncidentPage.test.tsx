import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { getCategories } from '@/api/categories'
import { ApiError } from '@/api/errors'
import { incidentsApi } from '@/api/incidents'
import { servicesApi } from '@/api/services'
import { saveSession } from '@/auth/session'
import { AuthProvider } from '@/auth/AuthProvider'
import { ReportIncidentPage } from './ReportIncidentPage'

// Replace the network functions with fakes we control.
vi.mock('@/api/incidents', () => ({ incidentsApi: { report: vi.fn(), checkDuplicates: vi.fn() } }))
vi.mock('@/api/services', () => ({ servicesApi: { list: vi.fn() } }))
vi.mock('@/api/categories', () => ({ getCategories: vi.fn() }))
const reportMock = vi.mocked(incidentsApi.report)
const checkMock = vi.mocked(incidentsApi.checkDuplicates)
const servicesMock = vi.mocked(servicesApi.list)
const categoriesMock = vi.mocked(getCategories)

function renderPage() {
  saveSession({
    token: 't',
    expiresAtMs: Date.now() + 3_600_000,
    user: { id: 'U-EMP-1', name: 'Asha', email: 'e@x', role: 'EMPLOYEE' },
  })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/incidents/new']}>
        <AuthProvider>
          <Routes>
            <Route path="/incidents/new" element={<ReportIncidentPage />} />
            <Route path="/incidents/:id" element={<p>detail page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Opens a Radix select by its label and picks an option. */
async function choose(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  reportMock.mockReset()
  checkMock.mockReset().mockResolvedValue([])
  servicesMock.mockReset().mockResolvedValue([
    { id: 3, name: 'Email', businessCriticality: 2, dependsOn: [], openIncidentCount: 0 },
  ])
  categoriesMock.mockReset().mockResolvedValue([
    { name: 'NETWORK', description: 'Network and connectivity issues' },
    { name: 'HARDWARE', description: 'Hardware issues' },
  ])
})

describe('ReportIncidentPage', () => {
  it('shows a message under every required field when submitted empty, and sends nothing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Report incident' }))

    expect(await screen.findByText('Enter a short title.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByText('Choose the affected service.')).toBeInTheDocument()
    expect(screen.getByText('Choose how many people are affected.')).toBeInTheDocument()
    expect(screen.getByText('Choose how urgent it is.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(reportMock).not.toHaveBeenCalled()
  })

  it('puts the backend validation messages under the matching fields', async () => {
    reportMock.mockRejectedValue(
      new ApiError(400, 'Title: size must be between 0 and 200.', 'Bad Request', {
        title: 'size must be between 0 and 200',
        serviceId: 'must not be null',
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Title'), 'Mailbox not syncing')
    await choose(user, /category/i, /^Network/)
    await choose(user, /affected service/i, /^Email/)
    await choose(user, /impact/i, /^Medium/)
    await choose(user, /urgency/i, /^High/)
    await user.click(screen.getByRole('button', { name: 'Report incident' }))

    expect(await screen.findByText('size must be between 0 and 200')).toBeInTheDocument()
    expect(screen.getByText('must not be null')).toBeInTheDocument()
    expect(reportMock).toHaveBeenCalledWith({
      title: 'Mailbox not syncing',
      description: undefined,
      categoryName: 'NETWORK',
      serviceId: 3,
      impact: 'MEDIUM',
      urgency: 'HIGH',
    })
  })

  it('goes to the new incident after a successful report', async () => {
    reportMock.mockResolvedValue({ id: 'INC-0042', priority: 'P2', assignedTechnicianName: 'Dev' } as never)
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Title'), 'Mailbox not syncing')
    await choose(user, /category/i, /^Network/)
    await choose(user, /affected service/i, /^Email/)
    await choose(user, /impact/i, /^Low/)
    await choose(user, /urgency/i, /^Low/)
    await user.click(screen.getByRole('button', { name: 'Report incident' }))

    expect(await screen.findByText('detail page')).toBeInTheDocument()
  })
})
