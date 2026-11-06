import 'server-only'

import { cookies } from 'next/headers'

// Each browser gets a random, http-only player id. The server matches it against a game's seats
// to decide who may move, so a player can't act on behalf of their opponent.
const COOKIE = 'chess4_player'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function getPlayerId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value
  return value && UUID.test(value) ? value : null
}

// Returns this browser's player id, issuing a new cookie if it has none. Route handlers only.
export async function ensurePlayerId(): Promise<string> {
  const existing = await getPlayerId()
  if (existing) return existing

  const id = crypto.randomUUID()
  ;(await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  })
  return id
}
