import type { AuditLogCriteria, DuplicateCheckRequest, IncidentSearchCriteria } from './types'
import type { PageRequest } from './incidents'

// Every TanStack Query cache key in one place. Keys are arrays; invalidating a prefix
// (e.g. ['incidents', 'list']) refreshes every query whose key starts with it.
export const queryKeys = {
  incident: (id: string) => ['incidents', 'detail', id] as const,
  incidentLists: () => ['incidents', 'list'] as const,
  // queue and at-risk sit under ['incidents', 'list'], so invalidating incidentLists() refreshes them too.
  queue: () => ['incidents', 'list', 'queue'] as const,
  atRisk: () => ['incidents', 'list', 'at-risk'] as const,
  incidentSearch: (criteria: IncidentSearchCriteria, page: PageRequest) =>
    ['incidents', 'list', 'search', criteria, page] as const,
  impact: (id: string) => ['incidents', 'impact', id] as const,
  recommendations: (id: string) => ['incidents', 'recommendations', id] as const,
  duplicates: (request: DuplicateCheckRequest) => ['incidents', 'duplicates', request] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  // Its own prefix (not under ['notifications']): refetching the list must not refetch the count we just set.
  unreadCount: (userId: string) => ['unread-count', userId] as const,
  services: () => ['services'] as const,
  serviceImpact: (id: number) => ['services', 'impact', id] as const,
  // Prefix for every report range, so a live event can refresh whichever range is on screen.
  reports: () => ['reports'] as const,
  report: (from: string, to: string) => ['reports', from, to] as const,
  slaPolicies: () => ['admin', 'sla-policies'] as const,
  strategy: () => ['admin', 'strategy'] as const,
  technicians: () => ['technicians'] as const,
  // Under ['technicians'], so refreshing the technician list also refreshes "me".
  technicianMe: () => ['technicians', 'me'] as const,
  users: () => ['admin', 'users'] as const,
  audit: (criteria: AuditLogCriteria, page: number) => ['admin', 'audit', criteria, page] as const,
  categories: () => ['categories'] as const,
}
