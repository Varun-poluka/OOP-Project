import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { handleUnauthorized } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/auth/useAuth'
import { eventToInvalidations, type CacheUpdate } from './eventToInvalidations'
import { createLiveConnection, type LiveStatus } from './liveConnection'
import { LiveStatusContext } from './liveContext'
import { openLiveStream } from './openLiveStream'

/**
 * Keeps the live stream open while someone is logged in and turns its events into cache
 * updates. It sits inside AppShell, which exists only while logged in: logging out unmounts
 * it, and the effect's cleanup stops the stream. A different user restarts it (userId changes).
 */
export function LiveUpdatesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const userId = user?.id ?? null

  useEffect(() => {
    if (userId === null) return
    let previous: LiveStatus = 'connecting'
    const connection = createLiveConnection({
      open: openLiveStream,
      onEvent: (event) => applyCacheUpdate(queryClient, eventToInvalidations(event, userId)),
      onStatus: (next) => {
        // Back after an outage: events sent meanwhile were missed, so refetch what they would have refreshed.
        if (previous === 'reconnecting' && next === 'live') catchUp(queryClient, userId)
        previous = next
        setStatus(next)
      },
      onUnauthorized: handleUnauthorized,
    })
    return () => connection.stop()
  }, [userId, queryClient])

  return <LiveStatusContext.Provider value={status}>{children}</LiveStatusContext.Provider>
}

function applyCacheUpdate(queryClient: QueryClient, update: CacheUpdate) {
  for (const { queryKey, data } of update.set) queryClient.setQueryData(queryKey, data)
  for (const queryKey of update.invalidate) void queryClient.invalidateQueries({ queryKey })
}

function catchUp(queryClient: QueryClient, userId: string) {
  void queryClient.invalidateQueries({ queryKey: ['incidents'] })
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount(userId) })
}
