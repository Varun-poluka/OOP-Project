import { useSyncExternalStore } from 'react'

// Light/dark mode. The "dark" class on <html> switches the CSS variables in index.css.
// The choice is remembered in localStorage (a per-browser preference, not a secret).
// "system" follows the operating system setting.
//
// The choice lives in this module, outside React, so every component that calls
// useTheme() sees the same value. useSyncExternalStore re-renders them when it changes.

export type ThemeChoice = 'light' | 'dark' | 'system'

const THEME_KEY = 'itsm.theme' // also read by the inline script in index.html

const listeners = new Set<() => void>()
let current: ThemeChoice = readChoice()

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked: fall through
  }
  return 'system'
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function apply(): void {
  const dark = current === 'dark' || (current === 'system' && darkQuery.matches)
  document.documentElement.classList.toggle('dark', dark)
}

// In "system" mode, follow the OS live if it switches (e.g. at sunset).
darkQuery.addEventListener('change', apply)
apply()

export function setTheme(next: ThemeChoice): void {
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
  } catch {
    // not saved; still applied for this page
  }
  current = next
  apply()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): { choice: ThemeChoice; setChoice: (next: ThemeChoice) => void } {
  const choice = useSyncExternalStore(subscribe, () => current)
  return { choice, setChoice: setTheme }
}
