// "Exponential backoff": after each failed attempt, wait twice as long before the next one
// (1 s, 2 s, 4 s ...), up to a ceiling. A backend that is down is not hammered with requests,
// and a short blip still reconnects within a second.

export const BACKOFF_START_MS = 1_000
export const BACKOFF_MAX_MS = 30_000

/** Delay before retry number `attempt` (0 = the first retry). */
export function backoffDelay(attempt: number): number {
  if (attempt < 0) throw new Error('attempt must be 0 or more')
  // Stop doubling early so 2 ** attempt never grows huge.
  if (attempt >= 5) return BACKOFF_MAX_MS
  return Math.min(BACKOFF_START_MS * 2 ** attempt, BACKOFF_MAX_MS)
}
