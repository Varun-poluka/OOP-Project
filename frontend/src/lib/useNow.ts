import { useEffect, useState } from 'react'

/** Returns Date.now(), updated every `intervalMs`, so time-based text re-renders on its own. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer) // stop ticking when the component disappears
  }, [intervalMs])
  return now
}
