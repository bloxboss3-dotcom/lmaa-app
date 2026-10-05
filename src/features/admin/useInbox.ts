import { useCallback, useEffect, useState } from 'react'
import { useRepository } from '@/app/context'
import { ContentError } from '@/data'
import type { ContactMessage, MessageStatus } from '@/domain/types'

/**
 * Messages from families, for the admin area only.
 *
 * Loaded separately from the content bundle on purpose: the bundle is public
 * and cached on every family's phone, while messages are private and only
 * ever requested by a signed-in staff member. The database enforces that.
 */
export function useInbox() {
  const { repository } = useRepository()
  const [messages, setMessages] = useState<ContactMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setError(null)
      setMessages(await repository.listMessages())
    } catch (cause) {
      setError(cause instanceof ContentError ? cause.message : 'Could not load messages.')
    }
  }, [repository])

  useEffect(() => {
    void reload()
  }, [reload])

  const setStatus = useCallback(
    async (id: string, status: MessageStatus) => {
      const updated = await repository.setMessageStatus(id, status)
      setMessages((current) =>
        current
          ? current.map((message) => (message.id === updated.id ? updated : message))
          : current,
      )
      return updated
    },
    [repository],
  )

  const unread = messages?.filter((message) => message.status === 'new').length ?? 0

  return { messages, loading: messages === null && !error, error, unread, reload, setStatus }
}
