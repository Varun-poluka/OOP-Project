import { createContext } from 'react'
import type { LiveStatus } from './liveConnection'

// Outside LiveUpdatesProvider there is no stream, so the default is "stopped" (keep polling).
export const LiveStatusContext = createContext<LiveStatus>('stopped')
