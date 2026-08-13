import { useCallback, useEffect, useState } from 'react'
import { useNotifications } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import {
  ALL_TOPIC_IDS,
  NOTIFICATION_TOPICS,
  detectCapabilities,
  type NotificationTopic,
} from '@/notifications'
import { STORAGE_KEYS } from '@/lib/storage'
import { useDocumentTitle, useStoredState } from '@/lib/hooks'

/**
 * Notification preferences.
 *
 * Two states, both told plainly:
 *  - push not connected: choices are saved on the device, nothing is promised;
 *  - push connected: the device really subscribes, and turning a topic off
 *    really stops those messages.
 */
export function NotificationsScreen() {
  const provider = useNotifications()
  const capabilities = detectCapabilities()
  const [topics, setTopics] = useStoredState<NotificationTopic[]>(
    STORAGE_KEYS.notificationPrefs,
    ALL_TOPIC_IDS,
  )
  const [permission, setPermission] = useState(() => provider.getPermission())
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useDocumentTitle('Notifications')

  useEffect(() => {
    let cancelled = false
    void provider
      .getSubscription()
      .then((subscription) => {
        if (!cancelled) setSubscribed(subscription !== null)
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false)
      })
    return () => {
      cancelled = true
    }
  }, [provider])

  const enable = useCallback(
    async (chosen: NotificationTopic[]) => {
      setBusy(true)
      setError(null)
      try {
        // Safari only honours a permission request inside a user gesture, so
        // this is always reached from a click and never from an effect.
        const next = await provider.requestPermission()
        setPermission(next)
        if (next !== 'granted') {
          setSubscribed(false)
          return
        }
        const subscription = await provider.subscribe(chosen)
        setSubscribed(subscription !== null)
        if (!subscription) {
          setError('This browser allowed notifications but would not complete the sign-up.')
        }
      } catch (cause) {
        console.error('[LMAA] Push subscribe failed', cause)
        setSubscribed(false)
        setError('Notifications could not be turned on. Please try again.')
      } finally {
        setBusy(false)
      }
    },
    [provider],
  )

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await provider.unsubscribe()
      setSubscribed(false)
    } catch (cause) {
      console.error('[LMAA] Push unsubscribe failed', cause)
      setError('Notifications could not be turned off. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [provider])

  const toggleTopic = (id: NotificationTopic, checked: boolean) => {
    const next = checked ? [...new Set([...topics, id])] : topics.filter((topic) => topic !== id)
    setTopics(next)
    // Already subscribed? Push the new choice straight through, so unticking a
    // box takes effect now rather than the next time they visit this screen.
    if (subscribed && provider.isConfigured && next.length) void enable(next)
    if (subscribed && !next.length) void disable()
  }

  const canSubscribe =
    provider.isConfigured && capabilities.supportsPush && !capabilities.requiresHomeScreenInstall

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
            <span className="mt-0.5 shrink-0 text-amber-800">
              <Icon name="info" size={20} />
            </span>
            <div>
              <h2 className="font-bold text-amber-800">Notifications are not switched on yet</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                The academy has not turned on push notifications. Your choices below are saved on
                this device and will be used as soon as they go live. Until then, open the app to
                see the latest updates.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <section>
        <h2 className="eyebrow mb-2">What to send me</h2>
        <div className="space-y-2">
          {NOTIFICATION_TOPICS.map((topic) => (
            <Checkbox
              key={topic.id}
              label={topic.label}
              hint={topic.description}
              checked={topics.includes(topic.id)}
              disabled={busy}
              onChange={(event) => toggleTopic(topic.id, event.target.checked)}
            />
          ))}
        </div>
        {topics.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">
            With nothing ticked you will not receive any notifications.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="eyebrow mb-2">This device</h2>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-700">Status</span>
            {subscribed ? (
              <Badge tone="success" icon="check">
                On for this device
              </Badge>
            ) : permission === 'denied' ? (
              <Badge tone="red">Blocked in browser settings</Badge>
            ) : permission === 'unsupported' || !capabilities.supportsPush ? (
              <Badge tone="muted">Not supported by this browser</Badge>
            ) : (
              <Badge tone="neutral">Off</Badge>
            )}
          </div>

          {capabilities.requiresHomeScreenInstall ? (
            <p className="text-sm leading-relaxed text-ink-600">
              On iPhone and iPad, notifications only work once the app has been added to your Home
              Screen. Add it first, then come back to this screen.
            </p>
          ) : null}

          {permission === 'denied' ? (
            <p className="text-sm leading-relaxed text-ink-600">
              Notifications are blocked for this site. You can turn them back on from your browser
              or phone settings, then come back here.
            </p>
          ) : null}

          {error ? (
            <p className="flex items-start gap-2 rounded-xl bg-crimson-50 px-3 py-2.5 text-sm font-medium text-crimson-700">
              <Icon name="alert" size={17} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canSubscribe && !subscribed && permission !== 'denied' ? (
              <Button
                icon="bell"
                disabled={busy || topics.length === 0}
                onClick={() => void enable(topics)}
              >
                {busy ? 'Turning on…' : 'Turn on notifications'}
              </Button>
            ) : null}
            {subscribed ? (
              <Button variant="secondary" disabled={busy} onClick={() => void disable()}>
                {busy ? 'Turning off…' : 'Turn off on this device'}
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
        Turning notifications on registers this device with the academy. No name, email or student
        information is stored — only an anonymous address your browser gives us so a message can
        reach this device, and the topics you ticked above. Turning them off deletes it.
      </p>
    </Screen>
  )
}
