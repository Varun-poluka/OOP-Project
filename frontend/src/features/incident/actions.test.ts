import { describe, expect, it } from 'vitest'
import { INCIDENT_STATUSES, type IncidentStatus, type UserResponse } from '@/api/types'
import { availableActions, type ActionSubject, type IncidentAction } from './actions'

const employee: UserResponse = { id: 'U-EMP-1', name: 'Asha', email: 'e@x', role: 'EMPLOYEE' }
const otherEmployee: UserResponse = { id: 'U-EMP-2', name: 'Other', email: 'o@x', role: 'EMPLOYEE' }
const technician: UserResponse = { id: 'U-TEC-1', name: 'Dev', email: 't@x', role: 'TECHNICIAN' }
const otherTechnician: UserResponse = { id: 'U-TEC-2', name: 'Neha', email: 'n@x', role: 'TECHNICIAN' }
const admin: UserResponse = { id: 'U-ADM-1', name: 'Ravi', email: 'a@x', role: 'ADMIN' }

function incident(status: IncidentStatus, assignedTechnicianId: string | null = 'U-TEC-1'): ActionSubject {
  return { status, reporterId: 'U-EMP-1', assignedTechnicianId }
}

// The expected table, written out in full: role x status -> actions.
const EXPECTED: Record<IncidentStatus, { reporter: IncidentAction[]; technician: IncidentAction[]; admin: IncidentAction[] }> = {
  NEW: { reporter: [], technician: [], admin: ['classify'] },
  CLASSIFIED: { reporter: [], technician: [], admin: ['assign'] },
  ASSIGNED: { reporter: [], technician: ['acknowledge'], admin: ['reassign'] },
  ACKNOWLEDGED: { reporter: [], technician: ['start', 'addNote'], admin: ['reassign'] },
  IN_PROGRESS: { reporter: [], technician: ['addNote', 'resolve'], admin: ['reassign'] },
  RESOLVED: { reporter: ['verify', 'reopen'], technician: [], admin: [] },
  VERIFIED: { reporter: ['close'], technician: [], admin: ['close'] },
  CLOSED: { reporter: [], technician: [], admin: [] },
}

describe('availableActions', () => {
  describe.each(INCIDENT_STATUSES)('status %s', (status) => {
    it('reporter (employee)', () => {
      expect(availableActions(incident(status), employee)).toEqual(EXPECTED[status].reporter)
    })
    it('assigned technician', () => {
      expect(availableActions(incident(status), technician)).toEqual(EXPECTED[status].technician)
    })
    it('admin', () => {
      expect(availableActions(incident(status), admin)).toEqual(EXPECTED[status].admin)
    })
    it('an employee who did not report it gets nothing', () => {
      expect(availableActions(incident(status), otherEmployee)).toEqual([])
    })
    it('a technician who is not assigned gets nothing', () => {
      expect(availableActions(incident(status), otherTechnician)).toEqual([])
    })
  })

  it('a technician gets nothing on an unassigned incident', () => {
    expect(availableActions(incident('ASSIGNED', null), technician)).toEqual([])
  })
})
