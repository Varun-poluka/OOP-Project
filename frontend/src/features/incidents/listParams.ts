import {
  INCIDENT_STATUSES,
  PRIORITIES,
  type IncidentSearchCriteria,
  type IncidentStatus,
  type Priority,
} from '@/api/types'
import type { PageRequest } from '@/api/incidents'

// The incident list keeps its filters in the URL (?status=RESOLVED&q=vpn&page=2&sort=oldest),
// so a filtered view survives a reload, can be bookmarked, and Back undoes a filter change.
// These pure functions translate between the URL and what the API expects.

export const PAGE_SIZE = 15

// Only fields the backend allows sorting by (IncidentService.SORTABLE_FIELDS).
export const SORT_OPTIONS = {
  newest: { label: 'Newest first', value: 'createdAt,desc' },
  oldest: { label: 'Oldest first', value: 'createdAt,asc' },
  priority: { label: 'Priority (P1 first)', value: 'priority,asc' },
  status: { label: 'Status (A–Z)', value: 'status,asc' },
  title: { label: 'Title (A–Z)', value: 'title,asc' },
} as const
export type SortKey = keyof typeof SORT_OPTIONS
export const DEFAULT_SORT: SortKey = 'newest'

export type ListFilters = {
  status: IncidentStatus | null
  priority: Priority | null
  text: string
  /** 1-based, as shown to people. */
  page: number
  sort: SortKey
}

/** Reads filters from the URL, ignoring anything unknown or malformed. */
export function readListFilters(params: URLSearchParams): ListFilters {
  const status = params.get('status')
  const priority = params.get('priority')
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  return {
    status: (INCIDENT_STATUSES as readonly string[]).includes(status ?? '') ? (status as IncidentStatus) : null,
    priority: (PRIORITIES as readonly string[]).includes(priority ?? '') ? (priority as Priority) : null,
    text: params.get('q') ?? '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sort: sort !== null && sort in SORT_OPTIONS ? (sort as SortKey) : DEFAULT_SORT,
  }
}

/** Writes filters back, leaving defaults out so URLs stay short. */
export function writeListFilters(filters: ListFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status !== null) params.set('status', filters.status)
  if (filters.priority !== null) params.set('priority', filters.priority)
  if (filters.text.trim() !== '') params.set('q', filters.text.trim())
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  return params
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return filters.status !== null || filters.priority !== null || filters.text.trim() !== ''
}

/** The search criteria and paging for GET /api/incidents/search (page is 0-based there). */
export function toSearchRequest(filters: ListFilters): { criteria: IncidentSearchCriteria; page: PageRequest } {
  const criteria: IncidentSearchCriteria = {}
  if (filters.status !== null) criteria.status = filters.status
  if (filters.priority !== null) criteria.priority = filters.priority
  if (filters.text.trim() !== '') criteria.text = filters.text.trim()
  return { criteria, page: { page: filters.page - 1, size: PAGE_SIZE, sort: SORT_OPTIONS[filters.sort].value } }
}
