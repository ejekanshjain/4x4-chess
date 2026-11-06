import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { GameRoom } from '@/components/game-room'
import { seatOf, toPublic } from '@/lib/game'
import { GAME_ID_PATTERN } from '@/lib/realtime'
import { getPlayerId } from '@/lib/server/player'
import { loadGame } from '@/lib/server/store'

export default function GamePage({ params }: PageProps<'/game/[id]'>) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:max-w-5xl">
      <Suspense fallback={<p className="text-muted">Loading game…</p>}>
        <Room params={params} />
      </Suspense>
    </main>
  )
}

// Loads the game on the server so the board renders with the first response.
async function Room({ params }: Pick<PageProps<'/game/[id]'>, 'params'>) {
  const { id } = await params
  if (!GAME_ID_PATTERN.test(id)) notFound()
  const game = await loadGame(id)
  if (!game) notFound()

  return <GameRoom key={id} initialGame={toPublic(game)} initialYou={seatOf(game, await getPlayerId())} />
}
