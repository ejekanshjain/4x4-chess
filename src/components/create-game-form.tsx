'use client'

import { useRouter } from 'next/navigation'

import { NameForm } from '@/components/name-form'
import { postJson } from '@/lib/api'

export function CreateGameForm() {
  const router = useRouter()
  return (
    <NameForm
      submitLabel="Create Game"
      onSubmit={async name => {
        const { id } = await postJson<{ id: string }>('/api/games', { name })
        router.push(`/game/${id}`)
      }}
    />
  )
}
