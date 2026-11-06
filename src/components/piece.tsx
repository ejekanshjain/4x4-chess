import type { CSSProperties } from 'react'

import type { Piece as PieceCode, PieceType } from '@/lib/chess'

export const PIECE_NAMES: Record<PieceType, string> = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' }

const BASE = 'M10 30h20l1 6H9z'

// Geometric piece outlines on a 40 by 40 grid: filled shapes, plus detail lines drawn on top.
const SHAPES: Record<PieceType, { fill: string[]; lines?: string[] }> = {
  P: { fill: ['M20 7a6 6 0 1 1 0 12a6 6 0 1 1 0-12z', 'M13 30c0-6 3-10 7-10s7 4 7 10z', BASE] },
  R: { fill: ['M11 7h4v3h3V7h4v3h3V7h4v8l-3 3v10h3v2H11v-2h3V18l-3-3z', BASE] },
  B: {
    fill: ['M20 4a3 3 0 1 1 0 6a3 3 0 1 1 0-6z', 'M20 9c-6 4-9 10-6 17h12c3-7 0-13-6-17z', 'M13 26h14v4H13z', BASE],
    lines: ['M23 13l-5 6']
  },
  N: {
    fill: ['M12 30c0-5 3-8 7-10l-7-1c-2-3 0-7 4-9l1-5 3 4c6 1 9 7 9 13v8z', BASE],
    lines: ['M17.5 12.5h.01']
  },
  Q: {
    fill: [
      'M9 13l4 14h14l4-14-6 6-5-11-5 11z',
      'M9 10a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
      'M20 5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
      'M31 10a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
      'M12 27h16v3H12z',
      BASE
    ]
  }
}

type Props = { piece: PieceCode; className?: string; style?: CSSProperties }

// A chess piece drawn as an SVG, so it looks the same on every device.
export function Piece({ piece, className = '', style }: Props) {
  const type = piece[1] as PieceType
  const { fill, lines = [] } = SHAPES[type]
  const stroke = { stroke: 'var(--stroke)', strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  return (
    <svg
      viewBox="0 0 40 40"
      className={`${piece[0] === 'w' ? 'piece-light' : 'piece-dark'} ${className}`}
      style={style}
      role="img"
      aria-label={`${piece[0] === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[type]}`}
    >
      {fill.map(d => (
        <path key={d} d={d} fill="var(--fill)" {...stroke} />
      ))}
      {lines.map(d => (
        <path key={d} d={d} fill="none" {...stroke} strokeWidth={3} />
      ))}
    </svg>
  )
}
