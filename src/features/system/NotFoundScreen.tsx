import { useRouteError } from 'react-router-dom'
import { Screen } from '@/components/layout/PageIntro'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { useDocumentTitle } from '@/lib/hooks'

export function NotFoundScreen() {
  useDocumentTitle('Not found')
  return (
    <Screen className="mx-auto max-w-2xl">
      <EmptyState
        title="We could not find that screen"
        description="The link may be old, or the page may have moved."
        action={
          <LinkButton to="/" variant="secondary" size="sm">
            Go to the home screen
          </LinkButton>
        }
      />
    </Screen>
  )
}

/**
 * Router-level error screen. Families see plain language; the technical detail
 * goes to the console for whoever is debugging.
 */
export function RouteErrorScreen() {
  const error = useRouteError()
  console.error('[LMAA] Route error', error)

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Sorry — this screen did not load properly. Reloading the app usually fixes it.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-xl bg-crimson-600 px-5 font-semibold text-white hover:bg-crimson-700"
          >
            Reload the app
          </button>
          <a
            href="#/"
            className="flex min-h-11 items-center rounded-xl border border-ink-200 bg-white px-5 font-semibold text-ink-800"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  )
}
