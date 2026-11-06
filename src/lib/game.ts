// The match around the drop chess rules: seats, colors, hands, turns, results and rematches.
// Shared by the server (which enforces it) and the browser (which renders it).

import {
  type Board,
  type Color,
  colorOf,
  type Hand,
  handSize,
  hasAction,
  movesFrom,
  opposite,
  PIECE_TYPES,
  type PieceType,
  placementSquares,
  positionKey,
  SIZE,
  START_HAND,
  typeOf
} from './chess.ts'

export type Seat = 'p1' | 'p2'
export type Status = 'waiting' | 'playing' | 'over'
export type EndReason = 'wipeout' | 'resign' | 'stalemate' | 'repetition' | 'quiet'
export type Result = { winner: Seat | null; reason: EndReason }
export type Player = { id: string; name: string }

// A game is drawn after this many turns in a row (both sides counted) with no capture or placement.
export const QUIET_LIMIT = 30

// Full game record as stored on the server. Player ids are secret and never leave the server.
export type Game = {
  id: string
  version: number
  players: Record<Seat, Player | null>
  colors: Record<Seat, Color>
  board: Board
  hands: Record<Color, Hand>
  turn: Color
  status: Status
  result: Result | null
  // `from` is null when the last action placed a piece.
  lastMove: { from: number | null; to: number } | null
  // Turns since the last capture or placement, and the positions seen since then.
  quietPlies: number
  positions: string[]
  score: Record<Seat | 'draws', number>
  rematch: Seat[]
}

// What browsers receive: the game with player ids stripped.
export type PublicGame = Omit<Game, 'players'> & {
  players: Record<Seat, { name: string } | null>
}

// A rule violation the player can fix. `status` is the HTTP status the API responds with.
export class GameError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export const otherSeat = (seat: Seat): Seat => (seat === 'p1' ? 'p2' : 'p1')
export const seatWithColor = (game: Pick<Game, 'colors'>, color: Color): Seat => (game.colors.p1 === color ? 'p1' : 'p2')
export const piecesOnBoard = (board: Board, color: Color) => board.filter(p => p && colorOf(p) === color).length

// The parts of a game that reset at the start of every round.
function freshRound() {
  const board: Board = Array(SIZE * SIZE).fill(null)
  return {
    board,
    hands: { w: { ...START_HAND }, b: { ...START_HAND } },
    turn: 'w' as Color,
    result: null,
    lastMove: null,
    quietPlies: 0,
    positions: [positionKey(board, 'w')]
  }
}

// Creates a game with `host` in the first seat, playing White.
export function newGame(id: string, host: Player): Game {
  return {
    id,
    version: 0,
    players: { p1: host, p2: null },
    colors: { p1: 'w', p2: 'b' },
    status: 'waiting',
    score: { p1: 0, p2: 0, draws: 0 },
    rematch: [],
    ...freshRound()
  }
}

export function toPublic(game: Game): PublicGame {
  const strip = (p: Player | null) => (p ? { name: p.name } : null)
  return { ...game, players: { p1: strip(game.players.p1), p2: strip(game.players.p2) } }
}

export function seatOf(game: Game, playerId: string | null): Seat | null {
  if (!playerId) return null
  if (game.players.p1?.id === playerId) return 'p1'
  if (game.players.p2?.id === playerId) return 'p2'
  return null
}

function finish(game: Game, winner: Seat | null, reason: EndReason) {
  game.status = 'over'
  game.result = { winner, reason }
  game.score[winner ?? 'draws']++
}

const isSquare = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < SIZE * SIZE
const isPieceType = (value: unknown): value is PieceType => PIECE_TYPES.includes(value as PieceType)

// Plays a turn for `seat` in place. `input` is the untrusted request body, either
// { kind: 'move', from, to, promotion } or { kind: 'place', piece, to }. Throws GameError when
// the action is illegal.
export function playAction(game: Game, seat: Seat, input: Record<string, unknown>) {
  if (game.status !== 'playing') throw new GameError('The game is not in progress.', 409)
  const color = game.colors[seat]
  if (game.turn !== color) throw new GameError('It is not your turn.', 409)
  if (!isSquare(input.to)) throw new GameError('Pick a square on the board.')
  const to = input.to

  let captured = false
  let pawnMoved = false
  if (input.kind === 'place') {
    const type = input.piece
    if (!isPieceType(type)) throw new GameError('Pick a piece from your hand.')
    if (game.hands[color][type] < 1) throw new GameError('You have none of those left to place.', 409)
    if (!placementSquares(game.board, color, type).includes(to)) {
      throw new GameError(type === 'P' ? 'Pawns cannot go on the far row or an occupied square.' : 'Pick an empty square.', 409)
    }
    game.board[to] = `${color}${type}`
    game.hands[color][type]--
    game.lastMove = { from: null, to }
  } else if (input.kind === 'move') {
    const { from, promotion } = input
    if (!isSquare(from)) throw new GameError('Pick a square on the board.')
    const piece = game.board[from]
    if (!piece || colorOf(piece) !== color) throw new GameError('Pick one of your own pieces.')
    const options = movesFrom(game.board, from).filter(a => a.to === to)
    if (!options.length) throw new GameError('That piece cannot move there.', 409)
    const move = options.length > 1 ? options.find(a => a.kind === 'move' && a.promotion === promotion) : options[0]
    if (!move || move.kind !== 'move') throw new GameError('Choose what your pawn becomes.')

    captured = !!game.board[to]
    pawnMoved = typeOf(piece) === 'P'
    game.board[to] = move.promotion ? `${color}${move.promotion}` : piece
    game.board[from] = null
    game.lastMove = { from, to }
  } else {
    throw new GameError('Send either a move or a placement.')
  }

  // Captures, placements and pawn moves can't be undone, so earlier positions can never repeat.
  const quiet = input.kind === 'move' && !captured
  game.quietPlies = quiet ? game.quietPlies + 1 : 0
  if (!quiet || pawnMoved) game.positions = []
  game.turn = opposite(color)
  const key = positionKey(game.board, game.turn)
  game.positions.push(key)

  const them = game.turn
  if (piecesOnBoard(game.board, them) === 0 && handSize(game.hands[them]) === 0) {
    finish(game, seat, 'wipeout')
  } else if (!hasAction(game.board, game.hands[them], them)) {
    finish(game, null, 'stalemate')
  } else if (game.positions.filter(p => p === key).length >= 3) {
    finish(game, null, 'repetition')
  } else if (game.quietPlies >= QUIET_LIMIT) {
    finish(game, null, 'quiet')
  }
}

export function resign(game: Game, seat: Seat) {
  if (game.status !== 'playing') throw new GameError('The game is not in progress.', 409)
  finish(game, otherSeat(seat), 'resign')
}

// Records a rematch request. Once both players ask, it clears the board and swaps colors.
export function requestRematch(game: Game, seat: Seat) {
  if (game.status !== 'over') throw new GameError('You can ask for a rematch once the game ends.', 409)
  if (!game.rematch.includes(seat)) game.rematch.push(seat)
  if (game.rematch.length < 2) return

  game.colors = { p1: game.colors.p2, p2: game.colors.p1 }
  game.status = 'playing'
  game.rematch = []
  Object.assign(game, freshRound())
}

// Trims and validates a display name. Throws GameError when it is empty or too long.
export function cleanName(input: unknown): string {
  const name = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new GameError('Enter a name so your opponent knows who you are.')
  if (name.length > 20) throw new GameError('Use a name of 20 characters or fewer.')
  return name
}
