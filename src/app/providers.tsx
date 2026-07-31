import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createRepository, type ContentBundle } from '@/data'
import { AuthError, createAuthService, type StaffSession } from '@/data/auth'
import { createNotificationProvider } from '@/notifications'
import type { StaffRole } from '@/domain/types'
import { ToastProvider } from '@/components/ui/Toast'
import {
  AuthContext,
  ContentContext,
  EMPTY_BUNDLE,
  NotificationContext,
  RepositoryContext,
  useRepository,
  type AuthValue,
  type ContentValue,
  type RepositoryValue,
} from './context'

function RepositoryProvider({ children }: { children: ReactNode }) {
  const [degraded, setDegraded] = useState(false)
  const handle = useMemo(
    () =>
      createRepository((isDegraded, error) => {
        setDegraded(isDegraded)
        if (isDegraded) console.warn('[LMAA] Falling back to built-in content.', error)
      }),
    [],
  )

  const value: RepositoryValue = useMemo(
    () => ({ repository: handle.repository, mode: handle.mode, degraded }),
    [handle, degraded],
  )

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}

function ContentProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<ContentBundle>(EMPTY_BUNDLE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Exactly one repository instance app-wide: the demo repository caches its
  // content, so a second instance would silently serve stale data after an
  // administrator saved something.
  const { repository } = useRepository()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const next = await repository.getBundle()
      if (!mounted.current) return
      setBundle(next)
      setError(null)
    } catch (cause) {
      console.error('[LMAA] Content load failed', cause)
      if (!mounted.current) return
      // Families never see technical errors.
      setError('We could not load the latest academy information. Please try again in a moment.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [repository])

  useEffect(() => {
    void load()
  }, [load])

  const value: ContentValue = useMemo(
    () => ({ bundle, loading, error, refresh: load }),
    [bundle, loading, error, load],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

function AuthProvider({ children }: { children: ReactNode }) {
  const service = useMemo(() => createAuthService(), [])
  const [session, setSession] = useState<StaffSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const signIn = useCallback(
    async (credentials: { email: string; password: string }) => {
      setError(null)
      try {
        const next = await service.signIn(credentials)
        setSession(next)
      } catch (cause) {
        const message =
          cause instanceof AuthError
            ? cause.message
            : 'Sign in did not work. Please check your connection and try again.'
        setError(message)
        throw cause
      }
    },
    [service],
  )

  const startDemo = useCallback(
    async (role: StaffRole) => {
      setError(null)
      const demoService = service as { startDemo?: (role: StaffRole) => Promise<StaffSession> }
      if (!demoService.startDemo) {
        setError('The demo administrator is only available when no database is connected.')
        return
      }
      setSession(await demoService.startDemo(role))
    },
    [service],
  )

  const signOut = useCallback(async () => {
    await service.signOut()
    setSession(null)
  }, [service])

  const value: AuthValue = useMemo(
    () => ({
      session,
      loading,
      service,
      signIn,
      startDemo,
      signOut,
      error,
      clearError: () => setError(null),
    }),
    [session, loading, service, signIn, startDemo, signOut, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function NotificationProviderScope({ children }: { children: ReactNode }) {
  const provider = useMemo(
    () =>
      createNotificationProvider(async () => {
        // Imported on demand so demo deployments never download Supabase.
        const { getSupabaseClient } = await import('@/data/supabase/client')
        const client = getSupabaseClient()
        if (!client) return null
        const { data } = await client.auth.getSession()
        return data.session?.access_token ?? null
      }),
    [],
  )
  return <NotificationContext.Provider value={provider}>{children}</NotificationContext.Provider>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <RepositoryProvider>
      <AuthProvider>
        <NotificationProviderScope>
          <ToastProvider>
            <ContentProvider>{children}</ContentProvider>
          </ToastProvider>
        </NotificationProviderScope>
      </AuthProvider>
    </RepositoryProvider>
  )
}
