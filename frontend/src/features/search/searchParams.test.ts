import { describe, expect, it } from 'vitest'
import {
  EMPTY_SEARCH,
  SEARCH_PAGE_SIZE,
  dateRangeProblem,
  hasActiveSearchFilters,
  readSearchFilters,
  toSearchCriteria,
  writeSearchFilters,
  type SearchFilters,
} from './searchParams'

const FULL: SearchFilters = {
  status: 'IN_PROGRESS',
  priority: 'P1',
  category: 'Network',
  technicianId: 'T-2',
  reporterId: 'U-EMP-7',
  from: '2026-11-01',
  to: '2026-11-20',
  breached: 'yes',
  text: 'vpn',
  page: 3,
  sort: 'priority',
}

describe('readSearchFilters / writeSearchFilters', () => {
  it('an empty URL is the empty search', () => {
    expect(readSearchFilters(new URLSearchParams())).toEqual(EMPTY_SEARCH)
  })

  it('round-trips all nine filters plus page and sort', () => {
    expect(readSearchFilters(writeSearchFilters(FULL))).toEqual(FULL)
  })

  it('uses short URL names', () => {
    expect(writeSearchFilters(FULL).toString()).toBe(
      'status=IN_PROGRESS&priority=P1&category=Network&technician=T-2&reporter=U-EMP-7' +
        '&from=2026-11-01&to=2026-11-20&breached=yes&q=vpn&page=3&sort=priority',
    )
  })

  it('leaves defaults out of the URL', () => {
    expect(writeSearchFilters(EMPTY_SEARCH).toString()).toBe('')
  })

  it('ignores unknown or malformed values', () => {
    const filters = readSearchFilters(
      new URLSearchParams('status=BROKEN&priority=P9&breached=maybe&from=2026-02-30&to=yesterday&page=-1&sort=hack'),
    )
    expect(filters).toEqual(EMPTY_SEARCH)
  })
})

describe('toSearchCriteria', () => {
  it('sends nothing for the empty search, with the default sort and 0-based page', () => {
    expect(toSearchCriteria(EMPTY_SEARCH)).toEqual({
      criteria: {},
      page: { page: 0, size: SEARCH_PAGE_SIZE, sort: 'createdAt,desc' },
    })
  })

  it('maps every filter to the backend criteria; "to" becomes the exclusive next midnight', () => {
    expect(toSearchCriteria(FULL)).toEqual({
      criteria: {
        status: 'IN_PROGRESS',
        priority: 'P1',
        categoryName: 'Network',
        technicianId: 'T-2',
        reporterId: 'U-EMP-7',
        from: '2026-11-01T00:00:00',
        to: '2026-11-21T00:00:00',
        breached: true,
        text: 'vpn',
      },
      page: { page: 2, size: SEARCH_PAGE_SIZE, sort: 'priority,asc' },
    })
  })

  it('breached "no" is sent as false; "any" is not sent', () => {
    expect(toSearchCriteria({ ...EMPTY_SEARCH, breached: 'no' }).criteria).toEqual({ breached: false })
    expect(toSearchCriteria({ ...EMPTY_SEARCH, breached: 'any' }).criteria).toEqual({})
  })

  it('rolls "to" over a month end', () => {
    expect(toSearchCriteria({ ...EMPTY_SEARCH, to: '2026-11-30' }).criteria.to).toBe('2026-12-01T00:00:00')
  })

  it('trims text fields and skips blank ones', () => {
    expect(toSearchCriteria({ ...EMPTY_SEARCH, text: '  ', reporterId: ' U-EMP-1 ' }).criteria).toEqual({ reporterId: 'U-EMP-1' })
  })
})

describe('hasActiveSearchFilters', () => {
  it('page and sort alone are not filters', () => {
    expect(hasActiveSearchFilters({ ...EMPTY_SEARCH, page: 4, sort: 'title' })).toBe(false)
  })

  it.each<Partial<SearchFilters>>([{ breached: 'no' }, { from: '2026-11-01' }, { technicianId: 'T-1' }, { text: 'x' }])(
    'is true for %j',
    (change) => {
      expect(hasActiveSearchFilters({ ...EMPTY_SEARCH, ...change })).toBe(true)
    },
  )
})

describe('dateRangeProblem', () => {
  it('allows one-sided and same-day ranges', () => {
    expect(dateRangeProblem({ from: '2026-11-05', to: '' })).toBeNull()
    expect(dateRangeProblem({ from: '2026-11-05', to: '2026-11-05' })).toBeNull()
  })

  it('flags from after to', () => {
    expect(dateRangeProblem({ from: '2026-11-06', to: '2026-11-05' })).not.toBeNull()
  })
})
