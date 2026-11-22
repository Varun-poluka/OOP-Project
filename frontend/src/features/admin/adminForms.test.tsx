import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { adminApi } from '@/api/admin'
import { ApiError } from '@/api/errors'
import type { CategoryResponse, TechnicianResponse } from '@/api/types'
import { AddCategoryDialog } from '@/pages/admin/CategoriesPage'
import { categorySchema, toCreateCategoryRequest } from './categorySchema'
import { CreateUserDialog } from './CreateUserDialog'
import { TechnicianEditDialog } from './TechnicianEditDialog'
import { maxWorkloadError, toUpdateRequest } from './technicianForm'
import { toCreateUserRequest, userSchema } from './userSchema'

vi.mock('@/api/admin', () => ({
  adminApi: { createUser: vi.fn(), createCategory: vi.fn(), updateTechnician: vi.fn() },
}))
const createUserMock = vi.mocked(adminApi.createUser)
const createCategoryMock = vi.mocked(adminApi.createCategory)
const updateTechnicianMock = vi.mocked(adminApi.updateTechnician)

const CATEGORIES: CategoryResponse[] = [
  { name: 'HARDWARE', description: 'Hardware issues' },
  { name: 'NETWORK', description: 'Network issues' },
]

function wrap(children: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>,
  )
}

beforeEach(() => {
  createUserMock.mockReset()
  createCategoryMock.mockReset()
  updateTechnicianMock.mockReset()
})

describe('userSchema', () => {
  const base = { name: 'Vikram Shah', email: 'Vikram@itsm.local', password: 'password123', maxWorkload: '', skills: [] }

  it('needs a workload only for technicians', () => {
    expect(userSchema.safeParse({ ...base, role: 'EMPLOYEE' }).success).toBe(true)
    const tech = userSchema.safeParse({ ...base, role: 'TECHNICIAN', maxWorkload: '0' })
    expect(tech.success).toBe(false)
    expect(tech.error?.issues[0].path).toEqual(['maxWorkload'])
  })

  it('sends technician fields only for a technician', () => {
    expect(toCreateUserRequest(userSchema.parse({ ...base, role: 'ADMIN' }))).toEqual({
      name: 'Vikram Shah', email: 'vikram@itsm.local', password: 'password123', role: 'ADMIN',
    })
    expect(toCreateUserRequest(userSchema.parse({ ...base, role: 'TECHNICIAN', maxWorkload: '4', skills: ['NETWORK', 'HARDWARE'] }))).toEqual({
      name: 'Vikram Shah', email: 'vikram@itsm.local', password: 'password123', role: 'TECHNICIAN', maxWorkload: 4, skills: ['HARDWARE', 'NETWORK'],
    })
  })
})

describe('CreateUserDialog', () => {
  it('shows technician fields only after choosing Technician, and sends them', async () => {
    createUserMock.mockResolvedValue({ id: 'U-TEC-6', name: 'Vikram Shah', email: 'vikram@itsm.local', role: 'TECHNICIAN', active: true })
    const onClose = vi.fn()
    const user = userEvent.setup()
    wrap(<CreateUserDialog categories={CATEGORIES} onClose={onClose} />)

    expect(screen.queryByLabelText('Max workload')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Full name'), 'Vikram Shah')
    await user.type(screen.getByLabelText('Email'), 'vikram@itsm.local')
    await user.type(screen.getByLabelText('Initial password'), 'password123')
    await user.click(screen.getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Technician' }))
    await user.clear(screen.getByLabelText('Max workload'))
    await user.type(screen.getByLabelText('Max workload'), '4')
    await user.click(screen.getByLabelText('HARDWARE'))
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(createUserMock).toHaveBeenCalledWith({
      name: 'Vikram Shah', email: 'vikram@itsm.local', password: 'password123', role: 'TECHNICIAN', maxWorkload: 4, skills: ['HARDWARE'],
    })
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('asks for a role and shows a duplicate email under the field', async () => {
    createUserMock.mockRejectedValue(new ApiError(409, 'An account with email admin@itsm.local already exists'))
    const user = userEvent.setup()
    wrap(<CreateUserDialog categories={CATEGORIES} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Full name'), 'Dup')
    await user.type(screen.getByLabelText('Email'), 'admin@itsm.local')
    await user.type(screen.getByLabelText('Initial password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Choose a role.')).toBeInTheDocument()
    expect(createUserMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Administrator' }))
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('This email already has an account.')).toBeInTheDocument()
  })
})

describe('categories', () => {
  it('categorySchema allows letters, digits and _ only', () => {
    expect(categorySchema.safeParse({ name: 'two words', description: '' }).success).toBe(false)
    expect(toCreateCategoryRequest(categorySchema.parse({ name: 'printing', description: '' }))).toEqual({
      name: 'PRINTING',
      description: undefined,
    })
  })

  it('AddCategoryDialog sends the category and shows a duplicate under the name', async () => {
    createCategoryMock.mockRejectedValueOnce(new ApiError(409, 'A category named NETWORK already exists'))
    const user = userEvent.setup()
    wrap(<AddCategoryDialog onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Name'), 'network')
    await user.click(screen.getByRole('button', { name: 'Add category' }))
    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument()
    expect(createCategoryMock).toHaveBeenCalledWith({ name: 'NETWORK', description: undefined })

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'bad name')
    await user.click(screen.getByRole('button', { name: 'Add category' }))
    expect(await screen.findByText('Use letters, digits and _ only (no spaces).')).toBeInTheDocument()
    expect(createCategoryMock).toHaveBeenCalledTimes(1)
  })
})

describe('technician edit', () => {
  const tech: TechnicianResponse = {
    id: 'U-TEC-1', name: 'Dev Database', skills: ['NETWORK'], available: true, activeIncidents: 3, maxWorkload: 4, active: true,
  }

  it('maxWorkloadError rejects non-numbers, out-of-range and below current work', () => {
    expect(maxWorkloadError('', 0)).toBe('Enter a whole number.')
    expect(maxWorkloadError('51', 0)).toBe('Use a number from 1 to 50.')
    expect(maxWorkloadError('2', 3)).toMatch(/^At least 3/)
    expect(maxWorkloadError('3', 3)).toBeNull()
  })

  it('toUpdateRequest turns "on leave" into available = false', () => {
    expect(toUpdateRequest({ skills: ['NETWORK', 'HARDWARE'], onLeave: true, maxWorkload: '6' })).toEqual({
      skills: ['HARDWARE', 'NETWORK'], available: false, maxWorkload: 6,
    })
  })

  it('TechnicianEditDialog blocks a workload below current work and saves a valid edit', async () => {
    updateTechnicianMock.mockResolvedValue({ ...tech, skills: ['HARDWARE', 'NETWORK'], available: false, maxWorkload: 6 })
    const onClose = vi.fn()
    const user = userEvent.setup()
    wrap(<TechnicianEditDialog tech={tech} categories={CATEGORIES} onClose={onClose} />)

    const workload = screen.getByLabelText('Max workload')
    await user.clear(workload)
    await user.type(workload, '2')
    expect(screen.getByText(/^At least 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.clear(workload)
    await user.type(workload, '6')
    await user.click(screen.getByLabelText('HARDWARE'))
    await user.click(screen.getByLabelText(/On leave/))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateTechnicianMock).toHaveBeenCalledWith('U-TEC-1', { skills: ['HARDWARE', 'NETWORK'], available: false, maxWorkload: 6 })
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
