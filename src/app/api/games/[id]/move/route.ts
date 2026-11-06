import { GameError, playAction, seatOf, toPublic } from '@/lib/game'
import { checkGameId, route, readJson } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { broadcast } from '@/lib/server/realtime'
import { updateGame } from '@/lib/server/store'

// Plays a turn. Body: { kind: 'place', piece, to } to place a piece from your hand, or
// { kind: 'move', from, to, promotion } to move one. Squares are 0 to 15.
export const POST = route(async (request: Request, ctx: RouteContext<'/api/games/[id]/move'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const body = await readJson(request)
  const playerId = await getPlayerId()

  const game = await updateGame(id, game => {
    const seat = seatOf(game, playerId)
    if (!seat) throw new GameError('Only the two players in this game can do that.', 403)
    playAction(game, seat, body)
  })
  await broadcast(game)
  return Response.json({ game: toPublic(game) })
})
