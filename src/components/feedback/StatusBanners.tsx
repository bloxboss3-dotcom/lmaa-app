import { useContent, useRepository } from '@/app/context'
import { Icon } from '@/components/ui/Icon'
import { useOnlineStatus } from '@/lib/hooks'
import { useAppUpdate } from '@/pwa/usePwa'

/**
 * Honest, quiet status messages: offline, stale content, new version ready.
 * None of them block the app or shout at families.
 */
export function StatusBanners() {
  const online = useOnlineStatus()
  const { degraded } = useRepository()
  const { error } = useContent()
  const { updateReady, applyUpdate, dismiss } = useAppUpdate()

  return (
    <div className="space-y-2" aria-live="polite">
      {!online ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white">
          <Icon name="wifiOff" size={18} className="mt-0.5 shrink-0 text-gold-400" />
          <p>
            You are offline. You can still read what you have already opened — new updates will
            appear when you reconnect.
          </p>
        </div>
      ) : null}

      {degraded && online ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          <p>We are having trouble reaching the academy&rsquo;s content right now.</p>
        </div>
      ) : null}

      {error && !degraded ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-crimson-50 px-4 py-3 text-sm font-medium text-crimson-800 ring-1 ring-crimson-100">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {updateReady ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white">
          <Icon name="refresh" size={18} className="shrink-0 text-gold-400" />
          <p className="min-w-0 flex-1 font-medium">A new version of the app is ready.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/70 hover:text-white"
            >
              Later
            </button>
            <button
              type="button"
              onClick={applyUpdate}
              className="rounded-lg bg-crimson-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-crimson-700"
            >
              Update now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
