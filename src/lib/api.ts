// Browser helper for the game API. Throws an Error carrying the server's message on failure.
export async function postJson<T>(path: string, body: object = {}): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `The server rejected the request (${res.status}). Try again.`)
  return data as T
}
