import { useState } from 'react'
import { useNotifications } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { detectCapabilities } from '@/notifications'
import { STORAGE_KEYS } from '@/lib/storage'
import { useDocumentTitle, useStoredState } from '@/lib/hooks'

interface Preferences {
  important: boolean
  schedule: boolean
  events: boolean
}

/**
 * Notification preferences.
 *
 * The screen is honest about the current state: no provider is connected, so
 * choices are saved on this device ready for when push is switched on, and
 * nothing pretends to be delivered.
 */
export function NotificationsScreen() {
  const provider = useNotifications()
  const capabilities = detectCapabilities()
  const [prefs, setPrefs] = useStoredState<Preferences>(STORAGE_KEYS.notificationPrefs, {
    important: true,
    schedule: true,
    events: true,
  })
  const [permission, setPermission] = useState(() => provider.getPermission())
  useDocumentTitle('Notifications')

  const requestPermission = async () => {
    setPermission(await provider.requestPermission())
  }

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="This app"
        title="Notifications"
        description="Choose what you would like to hear about from the academy."
      />

      {!provider.isConfigured ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-amber-700">
              <Icon name="info" size={20} />
            </span>
            <div>
              <h2 className="font-bold text-amber-900">Notifications are not connected yet</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/85">
                The academy has not switched on push notifications. Your choices below are saved on
                this device and will be used as soon as notifications go live. Until then, open the
                app to see the latest updates.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-2 eyebrow">
          What to send me
        </h2>
        <div className="space-y-2">
          <Checkbox
            label="Important academy announcements"
            hint="Closures, urgent notices and anything time-sensitive."
            checked={prefs.important}
            onChange={(event) => setPrefs({ ...prefs, important: event.target.checked })}
          />
          <Checkbox
            label="Schedule changes"
            hint="Cancelled classes and temporary time changes."
            checked={prefs.schedule}
            onChange={(event) => setPrefs({ ...prefs, schedule: event.target.checked })}
          />
          <Checkbox
            label="Events and testing"
            hint="New events, belt testing dates and camps."
            checked={prefs.events}
            onChange={(event) => setPrefs({ ...prefs, events: event.target.checked })}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 eyebrow">
          This device
        </h2>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-700">Browser permission</span>
            <Badge
              tone={
                permission === 'granted'
                  ? 'success'
                  : permission === 'denied'
                    ? 'red'
                    : permission === 'unsupported'
                      ? 'muted'
                      : 'neutral'
              }
            >
              {permission === 'granted'
                ? 'Allowed'
                : permission === 'denied'
                  ? 'Blocked'
                  : permission === 'unsupported'
                    ? 'Not supported'
                    : 'Not asked yet'}
            </Badge>
          </div>

          {capabilities.requiresHomeScreenInstall ? (
            <p className="text-sm leading-relaxed text-ink-600">
              On iPhone and iPad, notifications only work after the app has been added to your Home
              Screen. Add it first, then come back to this screen.
            </p>
          ) : null}

          {permission === 'denied' ? (
            <p className="text-sm leading-relaxed text-ink-600">
              Notifications are blocked for this site in your browser settings. You can turn them
              back on from your browser or phone settings.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {provider.isConfigured && permission !== 'granted' && permission !== 'unsupported' ? (
              <Button icon="bell" onClick={() => void requestPermission()}>
                Turn on notifications
              </Button>
            ) : null}
            {capabilities.requiresHomeScreenInstall ? (
              <LinkButton to="/more/install" variant="secondary" icon="download">
                How to add to Home Screen
              </LinkButton>
            ) : null}
          </div>
        </Card>
      </section>

      <p className="text-xs leading-relaxed text-ink-400">
        The academy never collects information about students through this app. Notification choices
        stay on your device until push notifications are switched on.
      </p>
    </Screen>
  )
}
