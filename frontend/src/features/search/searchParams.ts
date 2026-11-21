import {
  INCIDENT_STATUSES,
  PRIORITIES,
  type IncidentSearchCriteria,
  type IncidentStatus,
  type Priority,
} from '@/api/types'
import type { PageRequest } from '@/api/incidents'
import { DEFAULT_SORT, SORT_OPTIONS, type SortKey } from '@/features/incidents/listParams'
import { addDays, isDateText, startOfDay } from '@/lib/dates'

// The admin search keeps all nine filters in the URL, like My incidents does with its three.
// URL names are short and stable; toSearchRequest maps them to IncidentSearchCriteria.

export const SEARCH_PAGE_SIZE = 20

export type BreachedFilter = 'any' | 'yes' | 'no'

export type SearchFilters = {
  status: IncidentStatus | null
  priority: Priority | null
  /** Category name, '' for any. */
  category: string
  technicianId: string
  reporterId: string
  /** Created on or after this day ("YYYY-MM-DD"), '' for no limit. */
  from: string
  /** Created on or before this day, '' for no limit. */
  to: string
  breached: BreachedFilter
  text: string
  /** 1-based. */
  page: number
  sort: SortKey
}

export const EMPTY_SEARCH: SearchFilters = {
  status: null,
  priority: null,
  category: '',
  technicianId: '',
  reporterId: '',
  from: '',
  to: '',
  breached: 'any',
  text: '',
  page: 1,
  sort: DEFAULT_SORT,
}

/** Reads filters from the URL; unknown or malformed values count as "no filter". */
export function readSearchFilters(params: URLSearchParams): SearchFilters {
  const status = params.get('status') ?? ''
  const priority = params.get('priority') ?? ''
  const breached = params.get('breached')
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  const from = params.get('from')
  const to = params.get('to')
  return {
    status: (INCIDENT_STATUSES as readonly string[]).includes(status) ? (status as IncidentStatus) : null,
    priority: (PRIORITIES as readonly string[]).includes(priority) ? (priority as Priority) : null,
    category: (params.get('category') ?? '').trim(),
    technicianId: (params.get('technician') ?? '').trim(),
    reporterId: (params.get('reporter') ?? '').trim(),
    from: isDateText(from) ? from : '',
    to: isDateText(to) ? to : '',
    breached: breached === 'yes' || breached === 'no' ? breached : 'any',
    text: params.get('q') ?? '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sort: sort !== null && sort in SORT_OPTIONS ? (sort as SortKey) : DEFAULT_SORT,
  }
}

/** Writes filters back, leaving out defaults so the URL only shows what is actually filtered. */
export function writeSearchFilters(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status !== null) params.set('status', filters.status)
  if (filters.priority !== null) params.set('priority', filters.priority)
  if (filters.category.trim() !== '') params.set('category', filters.category.trim())
  if (filters.technicianId.trim() !== '') params.set('technician', filters.technicianId.trim())
  if (filters.reporterId.trim() !== '') params.set('reporter', filters.reporterId.trim())
  if (filters.from !== '') params.set('from', filters.from)
  if (filters.to !== '') params.set('to', filters.to)
  if (filters.breached !== 'any') params.set('breached', filters.breached)
  if (filters.text.trim() !== '') params.set('q', filters.text.trim())
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  return params
}

/** True when any filter is set (page and sort don't count: they change the view, not the results). */
export function hasActiveSearchFilters(filters: SearchFilters): boolean {
  return (
    filters.status !== null ||
    filters.priority !== null ||
    filters.category.trim() !== '' ||
    filters.technicianId.trim() !== '' ||
    filters.reporterId.trim() !== '' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.breached !== 'any' ||
    filters.text.trim() !== ''
  )
}

/**
 * Criteria and paging for GET /api/incidents/search. Only filters that are set are sent.
 * The backend's `to` is exclusive (createdAt < to), so "to 20 Nov" is sent as midnight on 21 Nov.
 */
export function toSearchCriteria(filters: SearchFilters): { criteria: IncidentSearchCriteria; page: PageRequest } {
  const criteria: IncidentSearchCriteria = {}
  if (filters.status !== null) criteria.status = filters.status
  if (filters.priority !== null) criteria.priority = filters.priority
  if (filters.category.trim() !== '') criteria.categoryName = filters.category.trim()
  if (filters.technicianId.trim() !== '') criteria.technicianId = filters.technicianId.trim()
  if (filters.reporterId.trim() !== '') criteria.reporterId = filters.reporterId.trim()
  if (filters.from !== '') criteria.from = startOfDay(filters.from)
  if (filters.to !== '') criteria.to = startOfDay(addDays(filters.to, 1))
  if (filters.breached !== 'any') criteria.breached = filters.breached === 'yes'
  if (filters.text.trim() !== '') criteria.text = filters.text.trim()
  return {
    criteria,
    page: { page: filters.page - 1, size: SEARCH_PAGE_SIZE, sort: SORT_OPTIONS[filters.sort].value },
  }
}

/** A problem with the date pair that the backend would reject, or null when fine. */
export function dateRangeProblem(filters: Pick<SearchFilters, 'from' | 'to'>): string | null {
  if (filters.from !== '' && filters.to !== '' && filters.from > filters.to) {
    return '"From" must be on or before "To".'
  }
  return null
}
