import type { DuplicateCheckRequest, IncidentSearchCriteria } from './types'
import type { PageRequest } from './incidents'

// Every TanStack Query cache key in one place. Keys are arrays; invalidating a prefix
// (e.g. ['incidents', 'list']) refreshes every query whose key starts with it.
export const queryKeys = {
  incident: (id: string) => ['incidents', 'detail', id] as const,
  incidentLists: () => ['incidents', 'list'] as const,
  incidentSearch: (criteria: IncidentSearchCriteria, page: PageRequest) =>
    ['incidents', 'list', 'search', criteria, page] as const,
  impact: (id: string) => ['incidents', 'impact', id] as const,
  recommendations: (id: string) => ['incidents', 'recommendations', id] as const,
  duplicates: (request: DuplicateCheckRequest) => ['incidents', 'duplicates', request] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  services: () => ['services'] as const,
  categories: () => ['categories'] as const,
}
