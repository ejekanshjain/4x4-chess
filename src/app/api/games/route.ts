import { randomBytes } from 'node:crypto'

import { cleanName, newGame } from '@/lib/game'
import { route, readJson } from '@/lib/server/http'
import { ensurePlayerId } from '@/lib/server/player'
import { insertGame } from '@/lib/server/store'

// Creates a game with the caller in the first seat, playing White. Body: { name }.
export const POST = route(async (request: Request) => {
  const { name } = await readJson(request)
  const game = newGame(randomBytes(7).toString('base64url'), { id: await ensurePlayerId(), name: cleanName(name) })
  await insertGame(game)
  return Response.json({ id: game.id }, { status: 201 })
})
