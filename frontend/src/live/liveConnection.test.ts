import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKOFF_MAX_MS, backoffDelay } from './backoff'
import {
  UnauthorizedError,
  createLiveConnection,
  type LiveStatus,
  type OpenStream,
  type StreamHandlers,
} from './liveConnection'

type Attempt = {
  handlers: StreamHandlers
  signal: AbortSignal
  resolve: () => void
  reject: (error: unknown) => void
}

/** A fake OpenStream: each call is recorded, and the test decides when and how it ends. */
function fakeStream() {
  const attempts: Attempt[] = []
  const open: OpenStream = (handlers, signal) =>
    new Promise<void>((resolve, reject) => {
      attempts.push({ handlers, signal, resolve, reject })
    })
  return { open, attempts }
}

function setup() {
  const stream = fakeStream()
  const statuses: LiveStatus[] = []
  const onEvent = vi.fn()
  const onUnauthorized = vi.fn()
  const connection = createLiveConnection({
    open: stream.open,
    onEvent,
    onStatus: (status) => statuses.push(status),
    onUnauthorized,
  })
  const last = () => stream.attempts[stream.attempts.length - 1]
  return { ...stream, statuses, onEvent, onUnauthorized, connection, last }
}

/** Ends the current attempt with an error and lets the promise callbacks run. */
async function fail(attempt: Attempt) {
  attempt.reject(new Error('network down'))
  await vi.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('backoffDelay', () => {
  it('doubles from 1 s and stops at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 50].map(backoffDelay)).toEqual([
      1000, 2000, 4000, 8000, 16000, BACKOFF_MAX_MS, BACKOFF_MAX_MS, BACKOFF_MAX_MS,
    ])
  })
})

describe('createLiveConnection', () => {
  it('connects at once and is live when the stream opens', () => {
    const t = setup()
    expect(t.attempts).toHaveLength(1)
    expect(t.statuses).toEqual(['connecting'])

    t.last().handlers.onOpen()
    expect(t.statuses).toEqual(['connecting', 'live'])
  })

  it('passes events on', () => {
    const t = setup()
    t.last().handlers.onEvent({ type: 'incident', data: { incidentId: 'INC-1' } })
    expect(t.onEvent).toHaveBeenCalledWith({ type: 'incident', data: { incidentId: 'INC-1' } })
  })

  it('retries after 1 s, 2 s, 4 s while it keeps failing', async () => {
    const t = setup()

    await fail(t.last())
    expect(t.statuses.at(-1)).toBe('reconnecting')
    await vi.advanceTimersByTimeAsync(999)
    expect(t.attempts).toHaveLength(1) // not yet
    await vi.advanceTimersByTimeAsync(1)
    expect(t.attempts).toHaveLength(2)

    await fail(t.last())
    await vi.advanceTimersByTimeAsync(1999)
    expect(t.attempts).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(t.attempts).toHaveLength(3)

    await fail(t.last())
    await vi.advanceTimersByTimeAsync(4000)
    expect(t.attempts).toHaveLength(4)
  })

  it('starts the backoff from 1 s again after a successful open', async () => {
    const t = setup()
    await fail(t.last())
    await vi.advanceTimersByTimeAsync(1000)
    await fail(t.last())
    await vi.advanceTimersByTimeAsync(2000)
    expect(t.attempts).toHaveLength(3)

    t.last().handlers.onOpen()
    await fail(t.last()) // the working stream drops later
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.attempts).toHaveLength(4)
  })

  it('reconnects when the server ends the stream normally', async () => {
    const t = setup()
    t.last().handlers.onOpen()
    t.last().resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.statuses.at(-1)).toBe('reconnecting')
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.attempts).toHaveLength(2)
  })

  it('stop() aborts the open stream and never reconnects', async () => {
    const t = setup()
    const attempt = t.last()
    attempt.handlers.onOpen()

    t.connection.stop()
    expect(attempt.signal.aborted).toBe(true)
    expect(t.statuses.at(-1)).toBe('stopped')

    attempt.resolve() // an aborted stream ends; that must not count as a failure
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.attempts).toHaveLength(1)
    attempt.handlers.onEvent({ type: 'incident', data: {} })
    expect(t.onEvent).not.toHaveBeenCalled()
  })

  it('stop() during the backoff wait cancels the pending retry', async () => {
    const t = setup()
    await fail(t.last())
    t.connection.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.attempts).toHaveLength(1)
    expect(t.statuses).toEqual(['connecting', 'reconnecting', 'stopped'])
  })

  it('stops for good and reports it when the token is rejected (401)', async () => {
    const t = setup()
    t.last().reject(new UnauthorizedError())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.onUnauthorized).toHaveBeenCalledTimes(1)
    expect(t.attempts).toHaveLength(1)
    expect(t.statuses.at(-1)).toBe('stopped')
  })
})
