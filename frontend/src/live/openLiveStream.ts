import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { buildUrl } from '@/api/client'
import { readSession } from '@/auth/session'
import { UnauthorizedError, type OpenStream } from './liveConnection'

/**
 * Opens GET /api/stream with fetch, so the token goes in the Authorization header.
 * (The browser's built-in EventSource cannot send headers, which would force the token into
 * the URL, where it ends up in server logs and browser history.)
 * fetchEventSource parses the "event:" / "data:" lines. Its own retry is switched off by
 * throwing from onclose/onerror; createLiveConnection decides when to reconnect.
 */
export const openLiveStream: OpenStream = (handlers, signal) => {
  // Read on every attempt, so a reconnect never uses a token from an older session.
  const session = readSession()
  if (session === null) return Promise.reject(new UnauthorizedError())

  return fetchEventSource(buildUrl('/api/stream'), {
    signal,
    headers: { Authorization: `Bearer ${session.token}`, Accept: EventStreamContentType },
    // By default it closes the stream while the tab is hidden; we want updates to keep arriving.
    openWhenHidden: true,
    async onopen(response) {
      if (response.status === 401) throw new UnauthorizedError()
      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.startsWith(EventStreamContentType)) {
        throw new Error(`Live stream failed with status ${response.status}`)
      }
      handlers.onOpen()
    },
    onmessage(message) {
      // A heartbeat comment can show up as an empty message; it carries nothing.
      if (message.event === '') return
      let data: unknown = null
      if (message.data !== '') {
        try {
          data = JSON.parse(message.data)
        } catch {
          return // not JSON: ignore rather than break the stream
        }
      }
      handlers.onEvent({ type: message.event, data })
    },
    onclose() {
      throw new Error('The server closed the live stream') // ends the promise; we reconnect
    },
    onerror(error) {
      throw error // never let the library retry by itself
    },
  })
}
