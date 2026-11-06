import { seatOf, toPublic } from '@/lib/game'
import { checkGameId, route } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { loadGame } from '@/lib/server/store'

// Returns the public game state plus the caller's seat (null for spectators).
export const GET = route(async (_request: Request, ctx: RouteContext<'/api/games/[id]'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const game = await loadGame(id)
  if (!game) return Response.json({ error: 'This game does not exist or has expired.' }, { status: 404 })
  return Response.json({ game: toPublic(game), you: seatOf(game, await getPlayerId()) })
})
