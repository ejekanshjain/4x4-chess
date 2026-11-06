import type { CSSProperties } from 'react'

import { CreateGameForm } from '@/components/create-game-form'
import { Piece } from '@/components/piece'
import { ThemeToggle } from '@/components/theme-toggle'
import { type Board, SIZE } from '@/lib/chess'

const STEPS = [
  'Enter your name and create a game. You play White.',
  'Send the game link to a colleague.',
  'Place or move one piece per turn. Capture all 16 of theirs to win.'
]

// A sample mid-game position for the home page board.
const SAMPLE: Board = [
  'bR', null, 'bB', null,
  null, 'bP', null, 'wN',
  'wP', null, 'wQ', null,
  null, 'bN', null, 'wR'
]

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="grid flex-1 items-center gap-10 py-8 md:grid-cols-[1fr_1.1fr] md:gap-14">
        <HeroBoard />
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl">4x4 Chess</h1>
            <p className="max-w-md text-lg text-muted">
              No kings and no setup. The board starts empty, you drop pieces from your hand, and the
              first player to capture everything the other owns wins.
            </p>
          </div>
          <CreateGameForm />
          <ol className="space-y-2.5">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3 font-semibold">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg text-sm font-bold text-bg">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  )
}

// A sample position, with pieces popping into place one by one.
function HeroBoard() {
  return (
    <div className="board mx-auto grid aspect-square w-full max-w-[420px] grid-cols-4" aria-hidden>
      {SAMPLE.map((piece, i) => (
        <div key={i} className={`relative ${(Math.floor(i / SIZE) + (i % SIZE)) % 2 === 0 ? 'bg-light-sq' : 'bg-dark-sq'}`}>
          {piece && (
            <Piece
              piece={piece}
              className="hero-piece absolute inset-[10%] size-[80%]"
              style={{ '--i': i } as CSSProperties}
            />
          )}
        </div>
      ))}
    </div>
  )
}
