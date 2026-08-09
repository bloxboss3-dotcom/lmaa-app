import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useRepository } from '@/app/context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { LogoMark } from '@/components/layout/Logo'
import { useDocumentTitle } from '@/lib/hooks'

/**
 * Staff sign-in.
 *
 * Demo mode offers an obvious, clearly-labelled local preview — no password
 * theatre that might be mistaken for real security. Supabase mode requires a
 * real account created by the academy owner; there is no public sign-up.
 */
export function AdminLoginScreen() {
  const { mode } = useRepository()
  const { signIn, startDemo, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  useDocumentTitle('Staff sign in')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    clearError()
    setBusy(true)
    try {
      await signIn({ email, password })
    } catch {
      /* the error message is already in context */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={116} />
          <h1 className="mt-3 text-xl">Staff content manager</h1>
          <p className="mt-1 text-sm text-ink-500">Lee&rsquo;s Martial Arts Academy · Wilsonville</p>
        </div>

        {mode === 'demo' ? (
          <Card className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <Icon name="info" size={18} className="mt-0.5 shrink-0" />
              <p>
                <strong className="font-bold">This is a demonstration.</strong> No database is
                connected, so there is no real sign-in and no real security. Anything you change is
                saved only in this browser.
              </p>
            </div>

            <div className="space-y-2">
              <Button fullWidth size="lg" icon="shield" onClick={() => void startDemo('admin')}>
                Explore as Administrator
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                icon="pencil"
                onClick={() => void startDemo('editor')}
              >
                Explore as Editor
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-ink-500">
              Editors can manage content. Administrators can also manage academy information and, in
              a connected project, staff access.
            </p>
          </Card>
        ) : (
          <Card>
            <form onSubmit={onSubmit} className="space-y-4">
              <TextField
                label="Email address"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {error ? (
                <p className="flex items-start gap-2 rounded-xl bg-crimson-50 px-3 py-2.5 text-sm font-medium text-crimson-700">
                  <Icon name="alert" size={17} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              ) : null}

              <Button type="submit" fullWidth size="lg" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>

              <p className="text-xs leading-relaxed text-ink-500">
                Staff accounts are created by the academy owner. There is no public sign-up. If you
                cannot get in, ask the owner to check your account.
              </p>
            </form>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm font-medium text-ink-500 hover:text-ink-900">
            ← Back to the family app
          </Link>
        </div>
      </div>
    </div>
  )
}
