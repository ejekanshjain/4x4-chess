'use client'

import Link from 'next/link'
import Pusher, { type PresenceChannel } from 'pusher-js'
import { useCallback, useEffect, useState } from 'react'

import { Board } from '@/components/board'
import { NameForm } from '@/components/name-form'
import { Piece, PIECE_NAMES } from '@/components/piece'
import { ThemeToggle } from '@/components/theme-toggle'
import { postJson } from '@/lib/api'
import { colorOf, movesFrom, PIECE_TYPES, type PieceType, placementSquares, type Promotion } from '@/lib/chess'
import { otherSeat, piecesOnBoard, type PublicGame, QUIET_LIMIT, type Seat, seatWithColor } from '@/lib/game'
import { gameChannel } from '@/lib/realtime'

type Props = { initialGame: PublicGame; initialYou: Seat | null }
type GameResponse = { game: PublicGame; you?: Seat | null }
// What you've picked: a piece type from your hand to place, or one of your pieces on the board.
type Selection = { kind: 'hand'; type: PieceType } | { kind: 'square'; square: number }

// Live game screen. The server owns the game: this component sends actions to the API and
// renders whatever state the server sends back or broadcasts through Pusher.
export function GameRoom({ initialGame, initialYou }: Props) {
  const gameId = initialGame.id
  const [game, setGame] = useState(initialGame)
  const [you, setYou] = useState(initialYou)
  const [online, setOnline] = useState<Seat[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Selections belong to the position they were made in, so any new turn clears them.
  const [picked, setPicked] = useState<{ version: number; selection: Selection } | null>(null)
  const [promoting, setPromoting] = useState<{ version: number; from: number; to: number } | null>(null)

  // Broadcasts and API responses can arrive in either order, so keep the newest version.
  const apply = useCallback((next: PublicGame) => {
    setGame(current => (next.version >= current.version ? next : current))
  }, [])

  // Reconnects whenever `you` changes, so joining re-enters the channel as a player, not a spectator.
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' }
    })
    const channel = pusher.subscribe(gameChannel(gameId)) as PresenceChannel

    const syncMembers = () => {
      const seats: Seat[] = []
      channel.members.each((member: { id: string }) => {
        if (member.id === 'p1' || member.id === 'p2') seats.push(member.id)
      })
      setOnline(seats)
    }
    // Catch up on anything broadcast before this subscription started or while disconnected.
    const refresh = async () => {
      const res = await fetch(`/api/games/${gameId}`, { cache: 'no-store' })
      if (res.ok) apply(((await res.json()) as GameResponse).game)
    }

    channel.bind('pusher:subscription_succeeded', () => {
      syncMembers()
      void refresh()
    })
    channel.bind('pusher:member_added', syncMembers)
    channel.bind('pusher:member_removed', syncMembers)
    channel.bind('state', apply)
    return () => pusher.disconnect()
  }, [gameId, you, apply])

  const send = useCallback(
    async (action: string, body?: object) => {
      setBusy(true)
      setError(null)
      try {
        const data = await postJson<GameResponse>(`/api/games/${gameId}/${action}`, body)
        apply(data.game)
        if (data.you) setYou(data.you)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [gameId, apply]
  )

  const myColor = you ? game.colors[you] : 'w'
  const canAct = !!you && game.status === 'playing' && game.turn === myColor && !busy
  const selection = canAct && picked?.version === game.version ? picked.selection : null
  const pending = canAct && promoting?.version === game.version ? promoting : null
  const moves = selection?.kind === 'square' ? movesFrom(game.board, selection.square) : []
  const targets = new Set(
    selection?.kind === 'hand' ? placementSquares(game.board, myColor, selection.type) : moves.map(m => m.to)
  )
  const select = (value: Selection | null) => setPicked(value && { version: game.version, selection: value })

  function onSquare(square: number) {
    if (!canAct || pending) return
    if (selection && targets.has(square)) {
      if (selection.kind === 'hand') {
        void send('move', { kind: 'place', piece: selection.type, to: square })
      } else {
        const options = moves.filter(m => m.to === square)
        if (options.length > 1) setPromoting({ version: game.version, from: selection.square, to: square })
        else void send('move', options[0])
      }
      select(null)
      return
    }
    const piece = game.board[square]
    const reselect = selection?.kind === 'square' && selection.square === square
    select(piece && colorOf(piece) === myColor && !reselect ? { kind: 'square', square } : null)
  }

  function onPromote(type: Promotion) {
    if (!pending) return
    void send('move', { kind: 'move', from: pending.from, to: pending.to, promotion: type })
    setPromoting(null)
  }

  function onPick(type: PieceType) {
    if (!canAct || pending) return
    const same = selection?.kind === 'hand' && selection.type === type
    select(same ? null : { kind: 'hand', type })
  }

  // You sit at the bottom. Spectators see White at the bottom.
  const bottom: Seat = you ?? seatWithColor(game, 'w')
  const top = otherSeat(bottom)
  const handPick = selection?.kind === 'hand' ? selection.type : null

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          4x4 Chess
        </Link>
        <div className="flex items-center gap-2">
          {game.status !== 'waiting' && <CopyLink label="Copy Link" />}
          <ThemeToggle />
        </div>
      </header>

      {/* On large screens the status sits in a right-hand column, so the board never shifts. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 lg:mx-0 lg:max-w-[min(560px,calc(100dvh-230px))]">
          <PlayerBar game={game} seat={top} you={you} online={online.includes(top)} />
          <Board
            game={game}
            bottom={game.colors[bottom]}
            selected={selection?.kind === 'square' ? selection.square : null}
            targets={targets}
            promotion={pending && { to: pending.to, color: myColor }}
            onSquare={onSquare}
            onPromote={onPromote}
          />
          <PlayerBar
            game={game}
            seat={bottom}
            you={you}
            online={online.includes(bottom)}
            picked={handPick}
            onPick={bottom === you && canAct ? onPick : undefined}
          />
        </div>

        <div
          className={`flex flex-col gap-4 lg:sticky lg:top-6 lg:w-80 lg:shrink-0 ${game.status === 'waiting' ? 'order-first lg:order-none' : ''}`}
        >
          <section aria-live="polite" className="card flex flex-col gap-3 p-5">
            <Status game={game} you={you} />
            {!you && game.status === 'waiting' && (
              <NameForm submitLabel="Join Game" onSubmit={name => send('join', { name })} />
            )}
            {you && game.status === 'over' && (
              <RematchControls game={game} you={you} busy={busy} onRematch={() => send('rematch')} />
            )}
            {you && game.status === 'playing' && <ResignButton busy={busy} onResign={() => send('resign')} />}
            {error && (
              <p role="alert" className="font-semibold text-accent">
                {error}
              </p>
            )}
          </section>
          <Rules />
        </div>
      </div>
    </>
  )
}

function Status({ game, you }: { game: PublicGame; you: Seat | null }) {
  const name = (seat: Seat) => game.players[seat]?.name ?? 'Player'

  if (game.status === 'waiting') {
    if (!you) {
      return (
        <div className="space-y-1">
          <p className="font-display text-xl font-bold">{name('p1')} wants a game</p>
          <p className="text-muted">Join to play Black.</p>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <p className="font-display text-xl font-bold">Waiting for an opponent</p>
        <p className="text-muted">Send the link to a colleague. You play White, and the game starts when they join.</p>
        <CopyLink label="Copy Invite Link" primary />
      </div>
    )
  }

  if (game.status === 'over' && game.result) {
    const { winner, reason } = game.result
    const loser = winner && otherSeat(winner)
    const detail = {
      wipeout: loser && (loser === you ? 'You have no pieces left.' : `${name(loser)} has no pieces left.`),
      resign: loser && (loser === you ? 'You resigned.' : `${name(loser)} resigned.`),
      stalemate: 'The player to move had no legal move or placement.',
      repetition: 'The same position came up three times.',
      quiet: `${QUIET_LIMIT / 2} turns each passed with no capture or placement.`
    }[reason]
    return (
      <div key={game.version} className="pop space-y-1">
        <p className="font-display text-3xl font-bold">
          {winner ? (winner === you ? 'You win!' : `${name(winner)} wins!`) : 'Draw'}
        </p>
        <p className="text-muted">{detail}</p>
      </div>
    )
  }

  const toMove = seatWithColor(game, game.turn)
  const quietLeft = QUIET_LIMIT - game.quietPlies
  return (
    <div className="space-y-1">
      <p className="font-display text-2xl font-bold">
        {toMove === you ? 'Your turn' : you ? `${name(toMove)} is thinking…` : `${name(toMove)} to move`}
      </p>
      {toMove === you && (
        <p className="text-sm text-muted">Pick a piece from your hand to place it, or click one of your pieces to move it.</p>
      )}
      {quietLeft <= 10 && (
        <p className="text-sm font-semibold text-accent">
          Draw in {quietLeft} {quietLeft === 1 ? 'turn' : 'turns'} unless someone captures or places a piece.
        </p>
      )}
    </div>
  )
}

type BarProps = {
  game: PublicGame
  seat: Seat
  you: Seat | null
  online: boolean
  picked?: PieceType | null
  // Present only for your own bar on your turn, which makes the hand clickable.
  onPick?: (type: PieceType) => void
}

function PlayerBar({ game, seat, you, online, picked, onPick }: BarProps) {
  const player = game.players[seat]
  const color = game.colors[seat]
  const hand = game.hands[color]
  const toMove = game.status === 'playing' && game.turn === color
  const onBoard = piecesOnBoard(game.board, color)

  return (
    <div
      className={`card flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 transition-colors ${toMove ? 'border-accent shadow-[0_0_0_2px_var(--accent)]' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {player?.name ?? 'Open seat'}
          {seat === you && <span className="ml-1.5 text-sm font-semibold text-muted">(you)</span>}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 text-xs font-semibold text-muted">
          {toMove ? (
            <span className="text-accent">To move</span>
          ) : (
            <span className="flex items-center gap-1.5">
              {player && <span className={`size-2 rounded-full ${online ? 'bg-dark-sq' : 'border border-muted'}`} />}
              {player ? (online ? 'Online' : 'Offline') : 'Waiting to join'}
            </span>
          )}
          <span>{onBoard} on board</span>
        </p>
      </div>

      {/* The hand: pieces still waiting to be placed. Pieces sit on board-colored tiles so both colors read. */}
      <div className="order-last flex w-full gap-1.5 sm:order-none sm:w-auto" role="group" aria-label={`${player?.name ?? 'Player'}'s hand`}>
        {PIECE_TYPES.map(type => {
          const count = hand[type]
          const active = picked === type
          const label = `${count} ${PIECE_NAMES[type]}${count === 1 ? '' : 's'}${onPick ? ', place one' : ''}`
          const content = (
            <>
              <Piece piece={`${color}${type}`} className="size-[78%]" />
              <span className="absolute right-0.5 bottom-0 text-[11px] font-bold text-dark-sq tabular-nums">{count}</span>
            </>
          )
          const tile = `relative grid size-11 flex-1 place-items-center rounded-lg bg-light-sq sm:flex-none ${count ? '' : 'opacity-30'}`
          return onPick ? (
            <button
              key={type}
              type="button"
              disabled={!count}
              onClick={() => onPick(type)}
              aria-label={label}
              aria-pressed={active}
              className={`${tile} cursor-pointer outline-none transition-transform enabled:hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-accent ${active ? 'ring-4 ring-accent' : ''}`}
            >
              {content}
            </button>
          ) : (
            <div key={type} className={tile} aria-label={label} role="img">
              {content}
            </div>
          )
        })}
      </div>

      <p className="font-display text-2xl font-bold tabular-nums" aria-label={`${game.score[seat]} wins`}>
        {game.score[seat]}
      </p>
    </div>
  )
}

function RematchControls({ game, you, busy, onRematch }: { game: PublicGame; you: Seat; busy: boolean; onRematch: () => void }) {
  const opponent = game.players[otherSeat(you)]?.name ?? 'Your opponent'
  if (game.rematch.includes(you)) {
    return <p className="font-semibold text-muted">Waiting for {opponent} to accept the rematch.</p>
  }
  const asked = game.rematch.includes(otherSeat(you))
  return (
    <div className="space-y-2">
      {asked && <p className="font-semibold">{opponent} wants a rematch. Colors swap.</p>}
      <button onClick={onRematch} disabled={busy} className="btn btn-primary w-full">
        {asked ? 'Accept Rematch' : 'Rematch'}
      </button>
    </div>
  )
}

// Resigning takes two clicks, so a stray click doesn't end the game.
function ResignButton({ busy, onResign }: { busy: boolean; onResign: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn btn-plain w-full">
        Resign
      </button>
    )
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => setConfirming(false)} className="btn btn-plain flex-1">
        Keep Playing
      </button>
      <button onClick={onResign} disabled={busy} className="btn btn-primary flex-1">
        Confirm Resign
      </button>
    </div>
  )
}

function Rules() {
  return (
    <section className="card space-y-2 p-5 text-sm text-muted">
      <h2 className="font-display text-sm font-bold text-fg">How It Plays</h2>
      <ul className="list-disc space-y-1 pl-4">
        <li>The board starts empty. On your turn, place a piece from your hand on an empty square, or move a piece.</li>
        <li>Pieces move like regular chess. There are no kings, and pawns cannot be placed on the far row.</li>
        <li>A pawn that reaches the far row becomes a Queen, Rook, Bishop, or Knight.</li>
        <li>Capture every piece your opponent has, on the board and in hand, to win.</li>
        <li>
          Draws: no legal move or placement, the same position three times, or {QUIET_LIMIT / 2} turns each with no
          capture or placement.
        </li>
      </ul>
    </section>
  )
}

function CopyLink({ label, primary }: { label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className={`btn ${primary ? 'btn-primary' : 'btn-plain text-sm'}`}
    >
      {copied ? 'Link Copied' : label}
    </button>
  )
}
