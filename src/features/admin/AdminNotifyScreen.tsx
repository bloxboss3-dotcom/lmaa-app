import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '@/app/context'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextArea, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { NOTIFICATION_TOPICS, type NotificationTopic } from '@/notifications'
import { WebPushNotificationProvider } from '@/notifications'
import { useDocumentTitle } from '@/lib/hooks'

/** Matches the Edge Function's own limits so a send never fails on length. */
const MAX_TITLE = 120
const MAX_MESSAGE = 400

/**
 * Send one notification to every family who asked for that kind of message.
 *
 * This screen makes three things impossible to get wrong:
 *  - sending to people who did not ask (topics are honoured server-side);
 *  - guessing the reach (the audience count is read from the database);
 *  - believing something was sent when it was not (the result is reported
 *    exactly as the sender returned it).
 */
export function AdminNotifyScreen() {
  const provider = useNotifications()
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [topic, setTopic] = useState<NotificationTopic>('updates')
  const [audience, setAudience] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ sent: boolean; reason: string } | null>(null)
  useDocumentTitle('Send a notification')

  const loadAudience = useCallback(
    async (forTopic: NotificationTopic) => {
      if (!(provider instanceof WebPushNotificationProvider)) {
        setAudience(null)
        return
      }
      try {
        setAudience(await provider.audienceCount(forTopic))
      } catch {
        // Not knowing the number is not an error worth shouting about; the
        // screen simply stops claiming one.
        setAudience(null)
      }
    },
    [provider],
  )

  useEffect(() => {
    void loadAudience(topic)
  }, [topic, loadAudience])

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !message.trim()) {
      notify('A notification needs both a title and a message.', 'error')
      return
    }
    setBusy(true)
    setResult(null)
    try {
      const outcome = await provider.send({
        title: title.trim(),
        message: message.trim(),
        url: topic === 'events' ? '#/events' : topic === 'schedule' ? '#/schedule' : '#/updates',
        topics: [topic],
      })
      setResult(outcome)
      notify(outcome.reason, outcome.sent ? 'success' : 'info')
      if (outcome.sent) {
        setTitle('')
        setMessage('')
        void loadAudience(topic)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">
          Send a notification
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Goes to every family who turned this kind of notification on. It cannot be unsent.
        </p>
      </div>

      {!provider.canSend ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <Icon name="info" size={20} className="mt-0.5 shrink-0 text-amber-800" />
            <div className="min-w-0">
              <h2 className="font-bold text-amber-800">Notifications are not switched on yet</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                Nothing can be sent until the academy&rsquo;s notification sender is set up. It is a
                one-time job and the steps are in <strong>PUSH_NOTIFICATIONS_SETUP.md</strong>.
                Everything below is disabled so nothing looks like it was delivered when it was not.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <form onSubmit={(event) => void send(event)} className="space-y-5" noValidate>
        <Card className="space-y-4">
          <SelectField
            label="Who should get this"
            value={topic}
            onChange={(event) => setTopic(event.target.value as NotificationTopic)}
            options={NOTIFICATION_TOPICS.map((item) => ({
              value: item.id,
              label: `${item.label} — ${item.description}`,
            }))}
            hint="Families choose which of these they want. Nobody else is sent it."
          />

          <TextField
            label="Title"
            required
            maxLength={MAX_TITLE}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Tuesday 5:00 class is cancelled"
            hint={`${title.length}/${MAX_TITLE} characters. This is the line people read first.`}
          />

          <TextArea
            label="Message"
            required
            rows={4}
            maxLength={MAX_MESSAGE}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Master Lee is away this evening. All other classes run as normal."
            hint={`${message.length}/${MAX_MESSAGE} characters. Phones show roughly the first two lines.`}
          />
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-700">Reaches</span>
            {audience === null ? (
              <Badge tone="muted">Unknown</Badge>
            ) : (
              <Badge tone={audience > 0 ? 'success' : 'neutral'}>
                {audience} device{audience === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink-500">
            {audience === 0
              ? 'Nobody has turned this kind of notification on yet, so this would not reach anyone.'
              : 'Counts devices, not people — one family may have several.'}
          </p>

          {result ? (
            <p
              className={
                result.sent
                  ? 'flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800'
                  : 'flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800'
              }
            >
              <Icon name={result.sent ? 'check' : 'info'} size={17} className="mt-0.5 shrink-0" />
              {result.reason}
            </p>
          ) : null}

          <Button
            type="submit"
            icon="bell"
            size="lg"
            disabled={busy || !provider.canSend || !title.trim() || !message.trim()}
          >
            {busy ? 'Sending…' : 'Send now'}
          </Button>
        </Card>
      </form>

      <Card className="bg-ink-50">
        <h2 className="text-sm font-semibold text-ink-900">Before you send</h2>
        <ul className="mt-2 space-y-1.5 pl-5 text-sm text-ink-600 marker:text-crimson-500 list-disc">
          <li>A notification cannot be edited or taken back once it has gone.</li>
          <li>
            If this is also worth having in the app, post it under{' '}
            <Link to="/admin/announcements/new" className="font-medium text-crimson-700 underline">
              Updates
            </Link>{' '}
            instead — that lets you notify and publish in one step.
          </li>
          <li>Keep it to things a parent needs tonight. Notifications people ignore get muted.</li>
        </ul>
      </Card>
    </div>
  )
}
