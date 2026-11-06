import { GameError, seatOf } from '@/lib/game'
import { gameIdFromChannel } from '@/lib/realtime'
import { route } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { pusher } from '@/lib/server/realtime'
import { loadGame } from '@/lib/server/store'

// Signs a browser into a game's presence channel. Players appear under their seat ('p1' or 'p2'),
// everyone else joins as a spectator. Only the server can send events on the channel.
export const POST = route(async (request: Request) => {
  const form = new URLSearchParams(await request.text())
  const socketId = form.get('socket_id') ?? ''
  const channel = form.get('channel_name') ?? ''
  const gameId = gameIdFromChannel(channel)
  if (!gameId || !/^\d+\.\d+$/.test(socketId)) throw new GameError('Invalid channel or socket.', 403)

  const game = await loadGame(gameId)
  if (!game) throw new GameError('This game does not exist or has expired.', 404)

  const seat = seatOf(game, await getPlayerId())
  const auth = pusher.authorizeChannel(socketId, channel, {
    user_id: seat ?? `spectator-${socketId}`,
    user_info: { name: seat ? game.players[seat]!.name : null }
  })
  return Response.json(auth)
})
