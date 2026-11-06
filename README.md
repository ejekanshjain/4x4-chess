# 4x4 Chess

A real-time, two-player chess game on a 4 by 4 board, with no kings and no fixed setup.

## Rules

- The board starts empty. Each player holds a chess army in hand, with a ninth pawn in place of the king: 1 Queen, 2 Rooks, 2 Bishops, 2 Knights and 9 Pawns.
- On your turn, place a piece from your hand on an empty square, or move a piece on the board. Placing never captures.
- Pieces move like regular chess. Pawns step one square forward, capture diagonally, and cannot be placed on the far row.
- A pawn that reaches the far row becomes a Queen, Rook, Bishop or Knight.
- Captured pieces leave the game. You win when your opponent has no pieces on the board and none in hand. You can also resign.
- The game is a draw when the player to move has no legal move or placement, when the same position comes up three times, or after 15 turns each with no capture or placement.
- Colors swap on every rematch.

## How It Works

- Next.js route handlers enforce every rule. Browsers only send moves and render the state they get back.
- Games live in Upstash Redis under `chess:` keys and expire after 24 hours without activity.
- Pusher presence channels push each new game state to both players and show who is online.
- Each browser gets an http-only player cookie, which decides the seat it plays.

## Setup

Create `.env.local` with your credentials:

```bash
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_SECRET="your_pusher_secret"
NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
NEXT_PUBLIC_PUSHER_CLUSTER="your_pusher_cluster"
UPSTASH_REDIS_REST_URL="your_upstash_rest_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"
```

Then install and run:

```bash
bun install
bun run dev
```

To play against yourself, open the game link in a second browser or a private window.

## Scripts

- `bun run test` runs the chess rule tests.
- `bun run typecheck` checks types.
- `bun run lint` runs ESLint.
