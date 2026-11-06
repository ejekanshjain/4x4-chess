import 'server-only'

import Pusher from 'pusher'

import { type Game, toPublic } from '@/lib/game'
import { gameChannel } from '@/lib/realtime'

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
})

// Sends the latest game state to everyone in the room. A failed broadcast doesn't undo the saved
// change: browsers fetch the game again when they reconnect.
export async function broadcast(game: Game) {
  try {
    await pusher.trigger(gameChannel(game.id), 'state', toPublic(game))
  } catch (error) {
    console.error(`Pusher broadcast for game ${game.id} failed; players see the change after reconnecting`, error)
  }
}
