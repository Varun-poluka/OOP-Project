import { describe, expect, it } from 'vitest'
import { canTakeMoreWork, unassignableReason } from './recommendations'

describe('canTakeMoreWork (mirrors the backend Technician rule)', () => {
  it('accepts an available technician below max workload', () => {
    expect(canTakeMoreWork({ available: true, activeIncidents: 2, maxWorkload: 3 })).toBe(true)
    expect(unassignableReason({ available: true, activeIncidents: 2, maxWorkload: 3 })).toBeNull()
  })

  it('refuses a technician at max workload', () => {
    expect(canTakeMoreWork({ available: true, activeIncidents: 3, maxWorkload: 3 })).toBe(false)
    expect(unassignableReason({ available: true, activeIncidents: 3, maxWorkload: 3 })).toBe('Full (3/3)')
  })

  it('refuses an unavailable technician even with free capacity', () => {
    expect(canTakeMoreWork({ available: false, activeIncidents: 0, maxWorkload: 3 })).toBe(false)
    expect(unassignableReason({ available: false, activeIncidents: 0, maxWorkload: 3 })).toBe('Unavailable')
  })
})
