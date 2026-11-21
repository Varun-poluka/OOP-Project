import { describe, expect, it } from 'vitest'
import { reportSchema, toCreateRequest } from './reportSchema'

const valid = {
  title: 'VPN drops every few minutes',
  description: 'Since Monday.',
  categoryName: 'NETWORK',
  serviceId: '3',
  impact: 'MEDIUM',
  urgency: 'HIGH',
}

/** Field -> first message, for the failing fields only. */
function errorsOf(input: unknown): Record<string, string> {
  const result = reportSchema.safeParse(input)
  if (result.success) return {}
  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = String(issue.path[0])
    if (!(field in errors)) errors[field] = issue.message
  }
  return errors
}

describe('reportSchema', () => {
  it('accepts a complete report', () => {
    expect(reportSchema.safeParse(valid).success).toBe(true)
  })

  it('reports every missing required field with its own message', () => {
    expect(errorsOf({ title: '', description: '', categoryName: '', serviceId: '' })).toEqual({
      title: 'Enter a short title.',
      categoryName: 'Choose a category.',
      serviceId: 'Choose the affected service.',
      impact: 'Choose how many people are affected.',
      urgency: 'Choose how urgent it is.',
    })
  })

  it('treats a title of only spaces as empty, and trims text', () => {
    expect(errorsOf({ ...valid, title: '    ' })).toEqual({ title: 'Enter a short title.' })
    const parsed = reportSchema.parse({ ...valid, title: '  Printer jam  ', description: '  ' })
    expect(parsed.title).toBe('Printer jam')
    expect(parsed.description).toBe('')
  })

  it('enforces the backend length limits', () => {
    expect(errorsOf({ ...valid, title: 'x'.repeat(201) }).title).toMatch(/under 200/)
    expect(errorsOf({ ...valid, title: 'x'.repeat(200) })).toEqual({})
    expect(errorsOf({ ...valid, description: 'x'.repeat(2001) }).description).toMatch(/under 2000/)
  })

  it('rejects values that are not in the enums', () => {
    expect(Object.keys(errorsOf({ ...valid, impact: 'HUGE', urgency: 'NOW' }))).toEqual(['impact', 'urgency'])
    expect(errorsOf({ ...valid, serviceId: 'abc' })).toEqual({ serviceId: 'Choose the affected service.' })
  })
})

describe('toCreateRequest', () => {
  it('converts the service id to a number and drops an empty description', () => {
    const values = reportSchema.parse({ ...valid, description: '' })
    expect(toCreateRequest(values)).toEqual({
      title: 'VPN drops every few minutes',
      description: undefined,
      categoryName: 'NETWORK',
      serviceId: 3,
      impact: 'MEDIUM',
      urgency: 'HIGH',
    })
  })
})
