// Rules for 4x4 drop chess, shared by the server (which enforces them) and the browser (which
// shows legal actions). The board starts empty and there are no kings: each turn you either place
// a piece from your hand on an empty square or move a piece already on the board.
// Squares are indexed row * 4 + col. Row 0 is rank 4 (Black's back row), col 0 is file a.

export const SIZE = 4

export type Color = 'w' | 'b'
export type PieceType = 'Q' | 'R' | 'B' | 'N' | 'P'
export type Piece = `${Color}${PieceType}`
export type Board = (Piece | null)[]
export type Hand = Record<PieceType, number>
export type Promotion = Exclude<PieceType, 'P'>
export type Action =
  | { kind: 'move'; from: number; to: number; promotion?: Promotion }
  | { kind: 'place'; piece: PieceType; to: number }

export const PIECE_TYPES: PieceType[] = ['Q', 'R', 'B', 'N', 'P']
export const PROMOTIONS: Promotion[] = ['Q', 'R', 'B', 'N']
// A full chess army with a ninth pawn in place of the king.
export const START_HAND: Hand = { Q: 1, R: 2, B: 2, N: 2, P: 9 }

const STRAIGHT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
]
const DIAGONAL = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
]
const KNIGHT = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1]
]

export const colorOf = (piece: Piece) => piece[0] as Color
export const typeOf = (piece: Piece) => piece[1] as PieceType
export const opposite = (color: Color): Color => (color === 'w' ? 'b' : 'w')
export const squareName = (index: number) => 'abcd'[index % SIZE] + (SIZE - Math.floor(index / SIZE))
export const handSize = (hand: Hand) => PIECE_TYPES.reduce((sum, type) => sum + hand[type], 0)

const onBoard = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE
// White pawns move up the board (toward row 0), Black pawns move down.
const forward = (color: Color) => (color === 'w' ? -1 : 1)
// The row where a color's pawns promote, and where they can't be placed.
export const farRow = (color: Color) => (color === 'w' ? 0 : SIZE - 1)

// Squares the piece on `from` can move to.
function reachable(board: Board, from: number): number[] {
  const piece = board[from]
  if (!piece) return []
  const color = colorOf(piece)
  const type = typeOf(piece)
  const row = Math.floor(from / SIZE)
  const col = from % SIZE
  const free = (i: number) => !board[i]
  const enemy = (i: number) => !!board[i] && colorOf(board[i]!) !== color
  const targets: number[] = []

  if (type === 'P') {
    const r = row + forward(color)
    if (onBoard(r, col) && free(r * SIZE + col)) targets.push(r * SIZE + col)
    for (const dc of [-1, 1]) {
      if (onBoard(r, col + dc) && enemy(r * SIZE + col + dc)) targets.push(r * SIZE + col + dc)
    }
    return targets
  }

  if (type === 'N') {
    for (const [dr, dc] of KNIGHT) {
      const i = (row + dr) * SIZE + col + dc
      if (onBoard(row + dr, col + dc) && (free(i) || enemy(i))) targets.push(i)
    }
    return targets
  }

  const directions = type === 'R' ? STRAIGHT : type === 'B' ? DIAGONAL : [...STRAIGHT, ...DIAGONAL]
  for (const [dr, dc] of directions) {
    for (let r = row + dr, c = col + dc; onBoard(r, c); r += dr, c += dc) {
      const i = r * SIZE + c
      if (free(i) || enemy(i)) targets.push(i)
      if (!free(i)) break
    }
  }
  return targets
}

// Every legal move for the piece on `from`. A pawn reaching the far row yields one move per
// promotion choice.
export function movesFrom(board: Board, from: number): Action[] {
  const piece = board[from]
  if (!piece) return []
  const promotes = (to: number) => typeOf(piece) === 'P' && Math.floor(to / SIZE) === farRow(colorOf(piece))
  return reachable(board, from).flatMap(to =>
    promotes(to)
      ? PROMOTIONS.map(promotion => ({ kind: 'move' as const, from, to, promotion }))
      : [{ kind: 'move' as const, from, to }]
  )
}

// Empty squares where `color` may place a piece of `type`. Pawns can't go on the far row.
export function placementSquares(board: Board, color: Color, type: PieceType): number[] {
  return board.flatMap((cell, i) => (!cell && !(type === 'P' && Math.floor(i / SIZE) === farRow(color)) ? [i] : []))
}

// Whether `color` has any legal move or placement.
export function hasAction(board: Board, hand: Hand, color: Color): boolean {
  const canMove = board.some((piece, i) => piece && colorOf(piece) === color && reachable(board, i).length > 0)
  return canMove || PIECE_TYPES.some(type => hand[type] > 0 && placementSquares(board, color, type).length > 0)
}

// Identifies a position for the repetition rule.
export const positionKey = (board: Board, turn: Color) => board.map(p => p ?? '--').join('') + turn
