import type { DefaultValues } from 'react-hook-form'
import { z } from 'zod'
import type { RegisterRequest } from '@/api/types'

// Limits copied from RegisterRequest on the backend (@Size(max = 100) name, password 8-100).
export const NAME_MAX = 100
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 100

// The same rules the admin's "New user" form uses for name, email and password.
export const nameField = z.string().trim().min(1, 'Enter your full name.').max(NAME_MAX, `Keep the name under ${NAME_MAX} characters.`)
export const emailField = z.string().trim().min(1, 'Enter your work email.').email('Enter a valid email address.')
export const passwordField = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Keep the password under ${PASSWORD_MAX} characters.`)

// refine() checks two fields together; path says which field shows the message.
export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'The passwords do not match.',
    path: ['confirmPassword'],
  })

export type RegisterFormInput = z.input<typeof registerSchema>
export type RegisterFormValues = z.output<typeof registerSchema>

export const EMPTY_REGISTER_FORM: DefaultValues<RegisterFormInput> = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

/** The request body: confirmPassword stays in the browser. */
export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  return { name: values.name, email: values.email.toLowerCase(), password: values.password }
}
