import { useEffect, useState } from 'react'
import { getFamilyService, type FamilySession } from '@/data/family'

/** The signed-in parent, if any. Shared by every screen through one service. */
export function useFamily() {
  const service = getFamilyService()
  const [session, setSession] = useState<FamilySession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void service
      .getSession()
      .then((current) => {
        if (active) setSession(current)
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const unsubscribe = service.onChange((next) => {
      if (active) setSession(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [service])

  return { service, session, loading, setSession }
}
