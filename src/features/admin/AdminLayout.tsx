import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, useContent, useRepository } from '@/app/context'
import { EMPTY_BUNDLE } from '@/app/context'
import type { ContentBundle } from '@/data'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { LogoMark } from '@/components/layout/Logo'
import { cx } from '@/lib/cx'
import { useDocumentTitle } from '@/lib/hooks'
import { AdminContentContext, type AdminContentValue } from './adminContext'
import { COLLECTIONS } from './collections'
import { AdminLoginScreen } from './AdminLoginScreen'

/**
 * Protected admin shell.
 *
 * Anyone not signed in sees the sign-in screen instead of the content tools —
 * in Supabase mode that is real authentication, in demo mode it is an
 * explicitly-labelled local preview.
 */
export function AdminLayout() {
  const { session, loading: authLoading, signOut } = useAuth()
  const { repository, mode } = useRepository()
  const { refresh: refreshPublic } = useContent()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<ContentBundle>(EMPTY_BUNDLE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  useDocumentTitle('Admin')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const next = await repository.getBundle({ includeUnpublished: true })
      setBundle(next)
      setError(null)
    } catch (cause) {
      console.error('[LMAA] Admin content load failed', cause)
      setError(
        'The academy content could not be loaded. Check your internet connection and try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [repository])

  const refresh = useCallback(async () => {
    await load()
    await refreshPublic()
  }, [load, refreshPublic])

  useEffect(() => {
    if (session) void load()
  }, [session, load])

  const value: AdminContentValue = useMemo(
    () => ({ bundle, loading, error, refresh }),
    [bundle, loading, error, refresh],
  )

  if (authLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <p className="text-sm font-medium text-ink-500">Checking your access…</p>
      </div>
    )
  }

  if (!session) return <AdminLoginScreen />

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: 'dashboard' as const, end: true },
    ...COLLECTIONS.map((collection) => ({
      to: `/admin/${collection.key}`,
      label: collection.title,
      icon: collection.icon,
      end: false,
    })),
    { to: '/admin/settings', label: 'Academy info', icon: 'sliders' as const, end: false },
  ]

  return (
    <AdminContentContext.Provider value={value}>
      <div className="min-h-dvh bg-canvas">
        {/* Top bar */}
        <header className="safe-top sticky top-0 z-40 border-b border-ink-100 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 md:h-16 md:px-6">
            <Link to="/admin" className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <span className="text-sm leading-tight font-semibold text-ink-900">
                LMAA
                <span className="eyebrow block">Content manager</span>
              </span>
            </Link>

            {/* Wrapped rather than given a `hidden` class: Tailwind resolves
                conflicting display utilities by stylesheet order, so the
                Badge's own `inline-flex` would win. */}
            {mode === 'demo' ? (
              <span className="hidden sm:block">
                <Badge tone="warning">Demo content · this device only</Badge>
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-1.5">
              <Link
                to="/"
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900 sm:flex"
              >
                <Icon name="eye" size={17} /> View app
              </Link>
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => navigate('/'))
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              >
                <Icon name="logout" size={17} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 md:hidden"
                aria-expanded={menuOpen}
                aria-label="Admin sections"
              >
                <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
              </button>
            </div>
          </div>

          {/* Mobile section menu */}
          {menuOpen ? (
            <nav className="border-t border-ink-100 bg-white px-3 pb-3 md:hidden">
              <ul className="grid grid-cols-2 gap-1.5 pt-2">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cx(
                          'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold',
                          isActive ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100',
                        )
                      }
                    >
                      <Icon name={item.icon} size={17} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </header>

        <div className="mx-auto flex max-w-6xl gap-6 px-3 py-5 md:px-6 md:py-7">
          {/* Desktop sidebar */}
          <nav aria-label="Admin sections" className="hidden w-56 shrink-0 md:block">
            <ul className="sticky top-24 space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        'flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-ink-900 text-white'
                          : 'text-ink-600 hover:bg-white hover:text-ink-900',
                      )
                    }
                  >
                    <Icon name={item.icon} size={18} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0 flex-1 space-y-5">
            {session.isDemo ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <Icon name="info" size={18} className="shrink-0" />
                <p className="min-w-0 flex-1 font-medium">
                  Demo mode — changes are saved in this browser only and are not shared with
                  families. Connect Supabase to publish for real.
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-crimson-50 px-4 py-3 text-sm text-crimson-900 ring-1 ring-crimson-100">
                <Icon name="alert" size={18} className="shrink-0" />
                <p className="min-w-0 flex-1 font-medium">{error}</p>
                <Button size="sm" variant="secondary" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : null}

            <Outlet />
          </main>
        </div>
      </div>
    </AdminContentContext.Provider>
  )
}
