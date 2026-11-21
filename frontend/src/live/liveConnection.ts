import { backoffDelay } from './backoff'

/**
 * connecting:   first attempt, not open yet
 * live:         the stream is open and events arrive
 * reconnecting: the stream failed or closed; waiting for (or making) the next attempt
 * stopped:      stop() was called, or the server rejected the token
 */
export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'stopped'

/** One server-sent event: its name ("incident", "notification", ...) and its parsed JSON data. */
export type LiveEvent = { type: string; data: unknown }

/** Thrown by an OpenStream when the server answers 401: retrying with the same token can't help. */
export class UnauthorizedError extends Error {
  constructor() {
    super('The live stream rejected the token')
    this.name = 'UnauthorizedError'
  }
}

export type StreamHandlers = { onOpen: () => void; onEvent: (event: LiveEvent) => void }

/**
 * Opens one stream. The promise settles when that stream is over:
 * resolves if the server ended it, rejects on any error (UnauthorizedError for a 401).
 * Aborting `signal` must end it too.
 */
export type OpenStream = (handlers: StreamHandlers, signal: AbortSignal) => Promise<void>

export type LiveConnectionOptions = {
  open: OpenStream
  onEvent: (event: LiveEvent) => void
  onStatus: (status: LiveStatus) => void
  onUnauthorized: () => void
}

export type LiveConnection = { stop: () => void }

/**
 * Keeps one live stream open: connects now, reconnects with backoff whenever the stream ends
 * or fails, and stops for good on stop() or a 401.
 * The real network code is passed in as `open`, so tests can drive this with a fake.
 */
export function createLiveConnection(options: LiveConnectionOptions): LiveConnection {
  let stopped = false
  let failures = 0 // failed attempts in a row; picks the next backoff delay
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null

  function setStatus(status: LiveStatus) {
    if (!stopped) options.onStatus(status)
  }

  function connect() {
    if (stopped) return
    const current = new AbortController()
    controller = current

    const handlers: StreamHandlers = {
      onOpen: () => {
        failures = 0 // a working connection resets the backoff
        setStatus('live')
      },
      onEvent: (event) => {
        if (!stopped) options.onEvent(event)
      },
    }

    options.open(handlers, current.signal).then(
      () => retryLater(current),
      (error: unknown) => {
        if (error instanceof UnauthorizedError) {
          stop()
          options.onUnauthorized()
          return
        }
        retryLater(current)
      },
    )
  }

  function retryLater(finished: AbortController) {
    // A stream we aborted ourselves (stop) is not a failure.
    if (stopped || finished.signal.aborted) return
    setStatus('reconnecting')
    const delay = backoffDelay(failures)
    failures += 1
    retryTimer = setTimeout(connect, delay)
  }

  function stop() {
    if (stopped) return
    options.onStatus('stopped')
    stopped = true
    clearTimeout(retryTimer)
    if (controller !== null) controller.abort()
  }

  options.onStatus('connecting')
  connect()
  return { stop }
}
