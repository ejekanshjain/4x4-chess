import type { CSSProperties } from 'react'

const COLORS = ['var(--accent)', 'var(--light-sq)', 'var(--dark-sq)', '#ffffff']

// Deterministic pseudo-random number in [0, 1) from integer hashing, so the pieces render
// identically on the server and in every browser.
const rand = (i: number, n: number) => {
  let h = Math.imul(i * 4 + n + 1, 2654435761)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

const PIECES = Array.from({ length: 60 }, (_, i) => ({
  '--x': `${(rand(i, 1) - 0.5) * 760}px`,
  '--y': `${-(rand(i, 2) * 260 + 120)}px`,
  '--r': `${rand(i, 3) * 900 - 450}deg`,
  '--delay': `${rand(i, 4) * 180}ms`,
  background: COLORS[i % COLORS.length],
  borderRadius: i % 3 === 0 ? '9999px' : undefined
})) as CSSProperties[]

// A one-shot burst over the board. Remount it (with a new key) to fire again.
export function Confetti() {
  return (
    // A clipped full-screen layer keeps pieces that fly off the edge from widening the page.
    <div aria-hidden className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <div className="absolute top-[45%] left-1/2">
        {PIECES.map((style, i) => (
          <span key={i} className="confetti-piece" style={style} />
        ))}
      </div>
    </div>
  )
}
