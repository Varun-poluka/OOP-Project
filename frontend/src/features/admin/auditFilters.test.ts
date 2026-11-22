import { describe, expect, it } from 'vitest'
import { NO_AUDIT_FILTERS, dateRangeError, nextDay, toAuditCriteria } from './auditFilters'

describe('toAuditCriteria', () => {
  it('sends nothing when no filter is set', () => {
    expect(toAuditCriteria(NO_AUDIT_FILTERS)).toEqual({})
  })

  it('upper-cases the incident id and turns days into a half-open range', () => {
    expect(
      toAuditCriteria({ incidentId: ' inc-0022 ', actorId: 'U-TEC-1', action: 'INFO_REQUESTED', fromDate: '2026-11-20', toDate: '2026-11-21' }),
    ).toEqual({
      incidentId: 'INC-0022',
      actorId: 'U-TEC-1',
      action: 'INFO_REQUESTED',
      from: '2026-11-20T00:00:00',
      to: '2026-11-22T00:00:00',
    })
  })
})

describe('nextDay', () => {
  it('rolls over months and years', () => {
    expect(nextDay('2026-11-30')).toBe('2026-12-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
  })
})

describe('dateRangeError', () => {
  it('flags a start after the end, and allows the same day', () => {
    expect(dateRangeError({ ...NO_AUDIT_FILTERS, fromDate: '2026-11-22', toDate: '2026-11-21' })).not.toBeNull()
    expect(dateRangeError({ ...NO_AUDIT_FILTERS, fromDate: '2026-11-21', toDate: '2026-11-21' })).toBeNull()
  })
})
