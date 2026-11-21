import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

beforeEach(() => vi.useFakeTimers()) // a fake clock we move forward by hand
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('only passes the value on after it stopped changing for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 600), {
      initialProps: { value: 'v' },
    })
    expect(result.current).toBe('v')

    rerender({ value: 'vp' })
    act(() => vi.advanceTimersByTime(400))
    rerender({ value: 'vpn' }) // typed again before 600 ms: the timer restarts
    act(() => vi.advanceTimersByTime(400))
    expect(result.current).toBe('v') // 800 ms since the first change, but only 400 since the last

    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('vpn')
  })
})
