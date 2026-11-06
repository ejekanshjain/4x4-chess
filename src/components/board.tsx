'use client'

import type { CSSProperties } from 'react'

import { Confetti } from '@/components/confetti'
import { Piece, PIECE_NAMES } from '@/components/piece'
import { type Color, type PieceType, type Promotion, PROMOTIONS, SIZE, squareName } from '@/lib/chess'
import type { PublicGame } from '@/lib/game'

type Props = {
  game: PublicGame
  // The color shown at the bottom. Black players see the board rotated.
  bottom: Color
  selected: number | null
  targets: Set<number>
  // Where a promoting pawn is waiting for its new piece type.
  promotion: { to: number; color: Color } | null
  onSquare: (square: number) => void
  onPromote: (type: Promotion) => void
}

// The 4 by 4 board. It only draws state and reports clicks; the game screen decides what a
// click means.
export function Board({ game, bottom, selected, targets, promotion, onSquare, onPromote }: Props) {
  // Display slot (0 = top left as you see it) to board square, and back. Rotating is its own inverse.
  const toSquare = (slot: number) => (bottom === 'b' ? SIZE * SIZE - 1 - slot : slot)
  const last = game.lastMove

  // The last moved piece slides in from its old square; a placed piece pops in.
  function motion(square: number): { className: string; style?: CSSProperties } {
    if (!last || last.to !== square) return { className: '' }
    if (last.from === null) return { className: 'pop' }
    const [from, to] = [toSquare(last.from), toSquare(last.to)]
    const dx = (from % SIZE) - (to % SIZE)
    const dy = Math.floor(from / SIZE) - Math.floor(to / SIZE)
    return { className: 'slide', style: { '--from-x': `${dx * 100}%`, '--from-y': `${dy * 100}%` } as CSSProperties }
  }

  return (
    <div className="relative">
      <div className="board grid aspect-square w-full grid-cols-4" role="group" aria-label="Chess board">
        {Array.from({ length: SIZE * SIZE }, (_, slot) => {
          const square = toSquare(slot)
          const light = (Math.floor(square / SIZE) + (square % SIZE)) % 2 === 0
          const piece = game.board[square]
          const isTarget = targets.has(square)
          const name = squareName(square)
          const { className, style } = motion(square)
          const label = `${name}${piece ? `, ${piece[0] === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece[1] as PieceType]}` : ''}${isTarget ? (piece ? ', capture' : ', choose') : ''}`

          return (
            <div key={square} className={`relative ${light ? 'bg-light-sq' : 'bg-dark-sq'}`}>
              {last && (last.from === square || last.to === square) && (
                <span className="absolute inset-0 bg-[rgb(255_170_40/0.45)]" />
              )}
              {piece && (
                <Piece
                  key={last?.to === square ? `moved-${game.version}` : 'still'}
                  piece={piece}
                  className={`absolute inset-[10%] size-[80%] ${className}`}
                  style={style}
                />
              )}
              {isTarget && (
                <span
                  className={`pointer-events-none absolute rounded-full ${piece ? 'inset-[6%] border-[5px] border-accent/80' : 'inset-[38%] bg-fg/35'}`}
                />
              )}
              {/* Coordinates along the edges you see: files on the bottom row, ranks on the left. */}
              {slot >= SIZE * (SIZE - 1) && (
                <span className={`absolute right-1.5 bottom-1 text-xs font-bold ${light ? 'text-dark-sq' : 'text-light-sq'}`}>
                  {name[0]}
                </span>
              )}
              {slot % SIZE === 0 && (
                <span className={`absolute top-1 left-1.5 text-xs font-bold ${light ? 'text-dark-sq' : 'text-light-sq'}`}>
                  {name[1]}
                </span>
              )}
              <button
                type="button"
                onClick={() => onSquare(square)}
                aria-label={label}
                aria-pressed={selected === square}
                className={`absolute inset-0 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-inset ${selected === square ? 'ring-4 ring-accent ring-inset' : ''}`}
              />
              {promotion?.to === square && (
                <div className="absolute inset-0 z-10 grid grid-cols-2 grid-rows-2 bg-surface/95">
                  {PROMOTIONS.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onPromote(type)}
                      aria-label={`Promote to ${PIECE_NAMES[type]}`}
                      className="grid place-items-center outline-none hover:bg-accent/20 focus-visible:bg-accent/20"
                    >
                      <Piece piece={`${promotion.color}${type}`} className="size-[85%]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {game.result?.reason === 'wipeout' && <Confetti key={game.version} />}
    </div>
  )
}
