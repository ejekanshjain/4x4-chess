import { GameError, resign, seatOf, toPublic } from '@/lib/game'
import { checkGameId, route } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { broadcast } from '@/lib/server/realtime'
import { updateGame } from '@/lib/server/store'

// Resigns the current game, giving the win to the opponent.
export const POST = route(async (_request: Request, ctx: RouteContext<'/api/games/[id]/resign'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const playerId = await getPlayerId()

  const game = await updateGame(id, game => {
    const seat = seatOf(game, playerId)
    if (!seat) throw new GameError('Only the two players in this game can do that.', 403)
    resign(game, seat)
  })
  await broadcast(game)
  return Response.json({ game: toPublic(game) })
})
