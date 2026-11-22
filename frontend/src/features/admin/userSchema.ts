import type { DefaultValues } from 'react-hook-form'
import { z } from 'zod'
import { ROLES, type CreateUserRequest } from '@/api/types'
import { emailField, nameField, passwordField } from '@/features/register/registerSchema'
import { MAX_WORKLOAD_LIMIT } from './technicianForm'

// The admin's "New user" form. Name, email and password follow the same rules as registration;
// a technician also needs a max workload (skills may be left empty).
export const userSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    role: z.enum(ROLES, { error: 'Choose a role.' }),
    maxWorkload: z.string(),
    skills: z.array(z.string()),
  })
  .superRefine((values, context) => {
    if (values.role !== 'TECHNICIAN') return
    const text = values.maxWorkload.trim()
    const number = Number(text)
    if (!/^\d+$/.test(text) || number < 1 || number > MAX_WORKLOAD_LIMIT) {
      context.addIssue({
        code: 'custom',
        path: ['maxWorkload'],
        message: `Use a number from 1 to ${MAX_WORKLOAD_LIMIT}.`,
      })
    }
  })

export type UserFormInput = z.input<typeof userSchema>
export type UserFormValues = z.output<typeof userSchema>

export const EMPTY_USER_FORM: DefaultValues<UserFormInput> = {
  name: '',
  email: '',
  password: '',
  maxWorkload: '3',
  skills: [],
}

export function toCreateUserRequest(values: UserFormValues): CreateUserRequest {
  const base = { name: values.name, email: values.email.toLowerCase(), password: values.password, role: values.role }
  if (values.role !== 'TECHNICIAN') return base
  return { ...base, maxWorkload: Number(values.maxWorkload), skills: [...values.skills].sort() }
}
