import { cleanName, GameError, seatOf, toPublic } from '@/lib/game'
import { checkGameId, route, readJson } from '@/lib/server/http'
import { ensurePlayerId } from '@/lib/server/player'
import { broadcast } from '@/lib/server/realtime'
import { updateGame } from '@/lib/server/store'

// Takes the open second seat, playing Black, and starts the game. Body: { name }.
export const POST = route(async (request: Request, ctx: RouteContext<'/api/games/[id]/join'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const name = cleanName((await readJson(request)).name)
  const playerId = await ensurePlayerId()

  const game = await updateGame(id, game => {
    if (seatOf(game, playerId)) throw new GameError('You are already in this game.', 409)
    if (game.players.p2) throw new GameError('This game already has two players.', 409)
    game.players.p2 = { id: playerId, name }
    game.status = 'playing'
  })
  await broadcast(game)
  return Response.json({ game: toPublic(game), you: 'p2' })
})
