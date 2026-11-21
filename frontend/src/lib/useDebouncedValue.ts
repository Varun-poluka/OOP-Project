import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 * While the user is typing, every keystroke restarts the timer, so a request
 * based on the result is sent once, after they pause, not once per key.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer) // a new value arrived first: cancel the old timer
  }, [value, delayMs])
  return debounced
}
