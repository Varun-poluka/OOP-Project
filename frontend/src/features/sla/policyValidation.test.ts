import { describe, expect, it } from 'vitest'
import { describeMinutes, validatePolicyDraft } from './policyValidation'

describe('validatePolicyDraft', () => {
  it('accepts whole minutes with resolution >= response', () => {
    expect(validatePolicyDraft({ responseMinutes: '15', resolutionMinutes: '240' })).toEqual({
      ok: true,
      value: { responseMinutes: 15, resolutionMinutes: 240 },
    })
  })

  it('accepts resolution equal to response, and trims spaces', () => {
    expect(validatePolicyDraft({ responseMinutes: ' 60 ', resolutionMinutes: '60' }).ok).toBe(true)
  })

  it.each(['', '0', '-5', '1.5', '1e3', '15 min', 'abc'])('rejects response %j', (text) => {
    const result = validatePolicyDraft({ responseMinutes: text, resolutionMinutes: '240' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.responseMinutes).toBeDefined()
  })

  it('rejects a number larger than a Java int', () => {
    const result = validatePolicyDraft({ responseMinutes: '1', resolutionMinutes: '3000000000' })
    expect(result.ok).toBe(false)
  })

  it('rejects resolution shorter than response, on the resolution field', () => {
    const result = validatePolicyDraft({ responseMinutes: '120', resolutionMinutes: '60' })
    expect(result).toEqual({ ok: false, errors: { resolutionMinutes: 'Must be at least the response time.' } })
  })

  it('reports both fields when both are wrong', () => {
    const result = validatePolicyDraft({ responseMinutes: '', resolutionMinutes: 'x' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['resolutionMinutes', 'responseMinutes'])
  })
})

describe('describeMinutes', () => {
  it.each([
    [15, '15m'],
    [60, '1h'],
    [90, '1h 30m'],
    [1440, '1d'],
    [2940, '2d 1h'],
  ])('%i minutes is %s', (minutes, text) => {
    expect(describeMinutes(minutes)).toBe(text)
  })
})
