import 'server-only'

import { type Game, GameError } from '@/lib/game'

// Games live in Upstash Redis as a hash { v: version, s: JSON }, and expire after a day of inactivity.
const TTL_SECONDS = 60 * 60 * 24

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

// Writes `s` only if the stored version still equals ARGV[1] ('' means the key must not exist yet).
// This stops two simultaneous moves from both being saved.
const SAVE_IF_UNCHANGED = `
local current = redis.call('HGET', KEYS[1], 'v') or ''
if current ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1], 'v', ARGV[2], 's', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 1`

async function redis<T>(command: (string | number)[]): Promise<T> {
  if (!url || !token) throw new Error('Upstash Redis env vars are missing; set them in .env.local')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    cache: 'no-store'
  })
  const data = (await res.json()) as { result?: T; error?: string }
  if (!res.ok || data.error) throw new Error(`Upstash ${command[0]} failed: ${data.error ?? res.status}`)
  return data.result as T
}

// Prefixed so chess games never collide with other apps sharing this Redis database.
const key = (id: string) => `chess:game:${id}`

export async function loadGame(id: string): Promise<Game | null> {
  const json = await redis<string | null>(['HGET', key(id), 's'])
  return json ? (JSON.parse(json) as Game) : null
}

async function save(game: Game, expectedVersion: number | null): Promise<boolean> {
  const saved = await redis<number>([
    'EVAL',
    SAVE_IF_UNCHANGED,
    1,
    key(game.id),
    expectedVersion === null ? '' : String(expectedVersion),
    String(game.version),
    JSON.stringify(game),
    TTL_SECONDS
  ])
  return saved === 1
}

export async function insertGame(game: Game) {
  if (!(await save(game, null))) throw new GameError('Could not create the game. Try again.', 409)
}

// Loads a game, applies `change` to a copy, and saves it if nobody else saved in between.
// Retries a few times when a concurrent write wins the race.
export async function updateGame(id: string, change: (game: Game) => void): Promise<Game> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await loadGame(id)
    if (!current) throw new GameError('This game does not exist or has expired.', 404)

    const next = structuredClone(current)
    change(next)
    next.version = current.version + 1
    if (await save(next, current.version)) return next
  }
  throw new GameError('The game changed while saving your action. Try again.', 409)
}
