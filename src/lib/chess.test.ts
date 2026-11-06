import assert from 'node:assert/strict'
import { test } from 'node:test'

import { type Board, type Hand, movesFrom, type Piece, placementSquares, positionKey } from './chess.ts'
import { type Game, newGame, playAction, requestRematch, resign } from './game.ts'

// Square index from a name like "b3".
const sq = (name: string) => (4 - Number(name[1])) * 4 + 'abcd'.indexOf(name[0])
const EMPTY_HAND: Hand = { Q: 0, R: 0, B: 0, N: 0, P: 0 }

function position(pieces: Record<string, Piece>): Board {
  const board: Board = Array(16).fill(null)
  for (const [name, piece] of Object.entries(pieces)) board[sq(name)] = piece
  return board
}

// A game in progress with p1 as White. Pass a board and hands to start from a custom position.
function startedGame(board?: Board, hands?: Partial<Record<'w' | 'b', Hand>>): Game {
  const game = newGame('test000000', { id: 'a', name: 'Ada' })
  game.players.p2 = { id: 'b', name: 'Bo' }
  game.status = 'playing'
  if (board) game.board = board
  if (hands) game.hands = { ...game.hands, ...hands }
  game.positions = [positionKey(game.board, 'w')]
  return game
}

const place = (game: Game, seat: 'p1' | 'p2', piece: string, to: string) =>
  playAction(game, seat, { kind: 'place', piece, to: sq(to) })
const move = (game: Game, seat: 'p1' | 'p2', from: string, to: string, promotion?: string) =>
  playAction(game, seat, { kind: 'move', from: sq(from), to: sq(to), promotion })

test('a new game starts empty with sixteen pieces in each hand', () => {
  const game = newGame('test000000', { id: 'a', name: 'Ada' })
  assert.ok(game.board.every(cell => cell === null))
  assert.deepEqual(game.hands.w, { Q: 1, R: 2, B: 2, N: 2, P: 9 })
})

test('placing takes a piece from your hand and passes the turn', () => {
  const game = startedGame()
  place(game, 'p1', 'N', 'b2')
  assert.equal(game.board[sq('b2')], 'wN')
  assert.equal(game.hands.w.N, 1)
  assert.equal(game.turn, 'b')
})

test('pawns cannot be placed on the far row', () => {
  const game = startedGame()
  assert.ok(!placementSquares(game.board, 'w', 'P').includes(sq('a4')))
  assert.ok(placementSquares(game.board, 'w', 'P').includes(sq('a1')))
  assert.ok(!placementSquares(game.board, 'b', 'P').includes(sq('a1')))
  assert.throws(() => place(game, 'p1', 'P', 'c4'), /far row/)
})

test('rejects placing on a taken square, from an empty hand, or out of turn', () => {
  const game = startedGame(position({ b2: 'bR' }), { w: { ...EMPTY_HAND, Q: 1 } })
  assert.throws(() => place(game, 'p1', 'Q', 'b2'), /empty square/)
  assert.throws(() => place(game, 'p1', 'R', 'a1'), /none of those/)
  assert.throws(() => place(game, 'p2', 'R', 'a1'), /not your turn/)
})

test('knights jump and bishops slide diagonally', () => {
  const board = position({ a1: 'wN', c3: 'bP', b1: 'wB' })
  assert.deepEqual(movesFrom(board, sq('a1')).map(a => a.to).sort(), [sq('b3'), sq('c2')].sort())
  assert.deepEqual(movesFrom(board, sq('b1')).map(a => a.to).sort(), [sq('a2'), sq('c2'), sq('d3')].sort())
})

test('a pawn reaching the far row promotes to your choice', () => {
  const game = startedGame(position({ b3: 'wP', d1: 'bR' }))
  assert.throws(() => move(game, 'p1', 'b3', 'b4'), /becomes/)
  move(game, 'p1', 'b3', 'b4', 'N')
  assert.equal(game.board[sq('b4')], 'wN')
})

test('capturing the last piece wins once the opponent hand is empty', () => {
  const game = startedGame(position({ a1: 'wR', a3: 'bN' }), { b: { ...EMPTY_HAND } })
  move(game, 'p1', 'a1', 'a3')
  assert.equal(game.status, 'over')
  assert.deepEqual(game.result, { winner: 'p1', reason: 'wipeout' })
  assert.equal(game.score.p1, 1)
})

test('an empty board side is not a loss while pieces remain in hand', () => {
  const game = startedGame(position({ a1: 'wR', a3: 'bN' }), { b: { ...EMPTY_HAND, P: 1 } })
  move(game, 'p1', 'a1', 'a3')
  assert.equal(game.status, 'playing')
})

test('no legal move or placement is a stalemate draw', () => {
  // Black's only pawn is blocked and its hand is empty.
  const game = startedGame(position({ b3: 'bP', a1: 'wR' }), { b: { ...EMPTY_HAND } })
  place(game, 'p1', 'R', 'b2')
  assert.deepEqual(game.result, { winner: null, reason: 'stalemate' })
})

test('the same position three times is a draw', () => {
  const game = startedGame(position({ a1: 'wR', d4: 'bR' }))
  for (let i = 0; i < 2; i++) {
    move(game, 'p1', 'a1', 'b1')
    move(game, 'p2', 'd4', 'c4')
    move(game, 'p1', 'b1', 'a1')
    move(game, 'p2', 'c4', 'd4')
  }
  assert.deepEqual(game.result, { winner: null, reason: 'repetition' })
})

test('resigning gives the win to the opponent, and a rematch swaps colors', () => {
  const game = startedGame()
  place(game, 'p1', 'Q', 'a1')
  resign(game, 'p2')
  assert.deepEqual(game.result, { winner: 'p1', reason: 'resign' })
  requestRematch(game, 'p1')
  requestRematch(game, 'p2')
  assert.deepEqual(game.colors, { p1: 'b', p2: 'w' })
  assert.ok(game.board.every(cell => cell === null))
  assert.equal(game.hands.w.Q, 1)
})
