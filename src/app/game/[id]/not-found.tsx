import Link from 'next/link'

export default function GameNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-3xl font-bold">Game Not Found</h1>
      <p className="text-muted">This game link is wrong, or the game expired after a day without moves.</p>
      <Link href="/" className="btn btn-primary">
        Start a New Game
      </Link>
    </div>
  )
}
