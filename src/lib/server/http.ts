import 'server-only'

import { GameError } from '@/lib/game'
import { GAME_ID_PATTERN } from '@/lib/realtime'

// Wraps a route handler so rule violations become JSON errors and anything else becomes a 500.
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof GameError) return Response.json({ error: error.message }, { status: error.status })
      console.error('API request failed with an unexpected error', error)
      return Response.json({ error: 'Something went wrong on the server. Try again.' }, { status: 500 })
    }
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') throw new GameError('Send a JSON object in the request body.')
  return body as Record<string, unknown>
}

export function checkGameId(id: string) {
  if (!GAME_ID_PATTERN.test(id)) throw new GameError('This game does not exist or has expired.', 404)
}
