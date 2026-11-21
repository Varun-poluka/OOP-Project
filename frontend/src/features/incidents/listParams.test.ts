import { describe, expect, it } from 'vitest'
import { readListFilters, toSearchRequest, writeListFilters } from './listParams'

describe('incident list URL filters', () => {
  it('reads defaults from an empty URL', () => {
    expect(readListFilters(new URLSearchParams())).toEqual({
      status: null,
      priority: null,
      text: '',
      page: 1,
      sort: 'newest',
    })
  })

  it('ignores unknown or malformed values', () => {
    const filters = readListFilters(new URLSearchParams('status=DONE&priority=P9&page=-3&sort=evil'))
    expect(filters).toMatchObject({ status: null, priority: null, page: 1, sort: 'newest' })
  })

  it('round-trips through the URL and leaves defaults out', () => {
    const filters = { status: 'RESOLVED', priority: 'P1', text: ' vpn ', page: 2, sort: 'oldest' } as const
    const params = writeListFilters(filters)
    expect(params.toString()).toBe('status=RESOLVED&priority=P1&q=vpn&page=2&sort=oldest')
    expect(readListFilters(params)).toEqual({ ...filters, text: 'vpn' })
    expect(writeListFilters({ status: null, priority: null, text: '', page: 1, sort: 'newest' }).toString()).toBe('')
  })

  it('builds the search request with a 0-based page and a whitelisted sort', () => {
    const request = toSearchRequest({ status: 'NEW', priority: null, text: 'mail', page: 3, sort: 'priority' })
    expect(request).toEqual({
      criteria: { status: 'NEW', text: 'mail' },
      page: { page: 2, size: 15, sort: 'priority,asc' },
    })
  })
})
