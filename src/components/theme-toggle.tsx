'use client'

import { type Theme, THEME_KEY } from '@/lib/theme'

// Flips between light and dark and remembers the choice. Both icons render, and CSS shows the
// one for the current theme, so the button never needs to read the theme during render.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const next: Theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      title="Switch Theme"
      className="btn btn-plain grid size-11 place-items-center p-0!"
    >
      <svg viewBox="0 0 24 24" className="size-5 dark:hidden" fill="currentColor" aria-hidden>
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="hidden size-5 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  )
}
