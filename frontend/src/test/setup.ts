import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom (the fake browser used by tests) has no matchMedia; lib/theme.ts needs it.
if (window.matchMedia === undefined) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// Radix UI (Select, dialogs) calls these browser functions, which jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
