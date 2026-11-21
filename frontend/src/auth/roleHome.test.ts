import { describe, expect, it } from 'vitest'
import { canAccess, homePathFor, postLoginPath } from './roleHome'

describe('homePathFor', () => {
  it('sends each role to its own home page', () => {
    expect(homePathFor('EMPLOYEE')).toBe('/incidents/mine')
    expect(homePathFor('TECHNICIAN')).toBe('/queue')
    expect(homePathFor('ADMIN')).toBe('/admin')
  })
})

describe('canAccess', () => {
  it('lets every role open shared pages', () => {
    for (const role of ['EMPLOYEE', 'TECHNICIAN', 'ADMIN'] as const) {
      expect(canAccess(role, '/notifications')).toBe(true)
      expect(canAccess(role, '/incidents/INC-1042')).toBe(true)
    }
  })

  it('keeps role pages to their role', () => {
    expect(canAccess('EMPLOYEE', '/incidents/new')).toBe(true)
    expect(canAccess('TECHNICIAN', '/incidents/new')).toBe(false) // not mistaken for /incidents/:id
    expect(canAccess('ADMIN', '/incidents/mine')).toBe(false)
    expect(canAccess('TECHNICIAN', '/queue')).toBe(true)
    expect(canAccess('EMPLOYEE', '/queue')).toBe(false)
    expect(canAccess('ADMIN', '/admin/sla')).toBe(true)
    expect(canAccess('TECHNICIAN', '/admin')).toBe(false)
  })

  it('denies unknown paths', () => {
    expect(canAccess('ADMIN', '/')).toBe(false)
    expect(canAccess('ADMIN', '/nope')).toBe(false)
    expect(canAccess('ADMIN', '/administrator')).toBe(false)
  })
})

describe('postLoginPath', () => {
  it('goes to the role home when nothing was requested', () => {
    expect(postLoginPath('TECHNICIAN', undefined)).toBe('/queue')
    expect(postLoginPath('ADMIN', null)).toBe('/admin')
  })

  it('returns to the requested page when the role may see it', () => {
    expect(postLoginPath('EMPLOYEE', '/incidents/INC-7?tab=notes')).toBe('/incidents/INC-7?tab=notes')
  })

  it('ignores a requested page the role may not see', () => {
    expect(postLoginPath('EMPLOYEE', '/admin/sla')).toBe('/incidents/mine')
  })

  it('never redirects off the site', () => {
    expect(postLoginPath('ADMIN', '//evil.example.com/admin')).toBe('/admin')
    expect(postLoginPath('ADMIN', 'https://evil.example.com')).toBe('/admin')
  })
})
