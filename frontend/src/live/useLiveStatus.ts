import { useContext } from 'react'
import { LiveStatusContext } from './liveContext'
import type { LiveStatus } from './liveConnection'

export function useLiveStatus(): LiveStatus {
  return useContext(LiveStatusContext)
}

/** Polling interval while the live stream is down; no polling while it is up. */
export const OFFLINE_POLL_MS = 30_000

/**
 * For a query's refetchInterval: `false` (never poll) while events arrive live,
 * otherwise re-ask the server every 30 s so the screen does not go stale.
 */
export function usePollWhileOffline(): number | false {
  return useLiveStatus() === 'live' ? false : OFFLINE_POLL_MS
}
