import type { QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import type { LiveEvent } from './liveConnection'

/**
 * What one server event means for the cache.
 *  - invalidate: mark these queries stale; the ones on screen refetch at once
 *  - set:        write this data straight into the cache (no request needed)
 */
export type CacheUpdate = {
  invalidate: QueryKey[]
  set: { queryKey: QueryKey; data: unknown }[]
}

const NOTHING: CacheUpdate = { invalidate: [], set: [] }

/**
 * Pure: maps a server-sent event to the cache changes it causes. The event only says *what*
 * changed; the fresh data is fetched by the normal queries, so there is one way data gets in.
 *
 * @param userId the logged-in user (the unread count is cached per user)
 */
export function eventToInvalidations(event: LiveEvent, userId: string): CacheUpdate {
  if (event.type === 'incident') {
    const incidentId = readString(event.data, 'incidentId')
    if (incidentId === null) return NOTHING
    return {
      // reports(): the admin dashboard's figures change with every incident event.
      invalidate: [
        queryKeys.incident(incidentId),
        queryKeys.incidentLists(),
        queryKeys.queue(),
        queryKeys.atRisk(),
        queryKeys.reports(),
      ],
      set: [],
    }
  }
  if (event.type === 'notification') {
    const unreadCount = readNumber(event.data, 'unreadCount')
    if (unreadCount === null) return NOTHING
    return {
      invalidate: [queryKeys.notifications(userId)],
      set: [{ queryKey: queryKeys.unreadCount(userId), data: { unreadCount } }],
    }
  }
  return NOTHING // "connected" and any event we don't know yet
}

function readString(data: unknown, field: string): string | null {
  if (data === null || typeof data !== 'object') return null
  const value = (data as Record<string, unknown>)[field]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumber(data: unknown, field: string): number | null {
  if (data === null || typeof data !== 'object') return null
  const value = (data as Record<string, unknown>)[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
