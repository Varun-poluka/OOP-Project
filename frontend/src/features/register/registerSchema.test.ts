import { describe, expect, it } from 'vitest'
import { registerSchema, toRegisterRequest } from './registerSchema'

const valid = { name: 'Nikhil Joshi', email: 'Nikhil@itsm.local', password: 'password123', confirmPassword: 'password123' }

function messages(input: Record<string, string>): Record<string, string> {
  const result = registerSchema.safeParse(input)
  if (result.success) return {}
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) byField[String(issue.path[0])] = issue.message
  return byField
}

describe('registerSchema', () => {
  it('accepts a complete form and trims the name', () => {
    const result = registerSchema.parse({ ...valid, name: '  Nikhil Joshi ' })
    expect(result.name).toBe('Nikhil Joshi')
  })

  it('names each problem under its own field', () => {
    expect(messages({ name: ' ', email: 'not-an-email', password: 'short', confirmPassword: 'short' })).toEqual({
      name: 'Enter your full name.',
      email: 'Enter a valid email address.',
      password: 'Use at least 8 characters.',
    })
  })

  it('needs both passwords to match', () => {
    expect(messages({ ...valid, confirmPassword: 'password124' })).toEqual({
      confirmPassword: 'The passwords do not match.',
    })
  })

  it('sends name, lowercased email and password, but not the confirmation', () => {
    expect(toRegisterRequest(registerSchema.parse(valid))).toEqual({
      name: 'Nikhil Joshi',
      email: 'nikhil@itsm.local',
      password: 'password123',
    })
  })
})
