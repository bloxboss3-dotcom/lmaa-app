import { useState, type FormEvent, type MouseEvent } from 'react'
import { useContent, useRepository } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Button, ExternalButton, LinkButton } from '@/components/ui/Button'
import { Card, EmptyState } from '@/components/ui/Card'
import { SelectField, TextArea, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { ContentError } from '@/data'
import { telHref } from '@/domain/format'
import {
  MESSAGE_LIMITS,
  MESSAGE_TOPIC_LABELS,
  messageMailto,
  normalizeMessage,
  validateMessage,
  type MessageErrors,
} from '@/domain/messages'
import { MESSAGE_TOPICS, type ContactMessageDraft, type MessageTopic } from '@/domain/types'
import { cx } from '@/lib/cx'
import { useDocumentTitle } from '@/lib/hooks'

const EMPTY: ContactMessageDraft = { name: '', contact: '', topic: 'general', body: '' }

/**
 * Message the academy from inside the app.
 *
 * Two honest modes, chosen by whether a backend exists:
 *   - Connected: the message is stored for staff (readable by staff only) and,
 *     if the academy switched it on, forwarded to its email. The screen says
 *     "sent" only after the database accepted it.
 *   - Demo / not connected: the app cannot deliver anything itself, so it
 *     hands the family's own mail app a finished email instead, and says so.
 *
 * Nothing typed here is kept on the device, and no account is needed.
 */
export function MessageScreen() {
  const { bundle } = useContent()
  const { repository, mode } = useRepository()
  const { notify } = useToast()
  useDocumentTitle('Message the academy')

  const { settings } = bundle
  const canDeliver = mode === 'supabase'
  const academyEmail = settings.email

  const [values, setValues] = useState<ContactMessageDraft>(EMPTY)
  const [errors, setErrors] = useState<MessageErrors>({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<ContactMessageDraft | null>(null)
  const [handedToMail, setHandedToMail] = useState(false)
  // A field no person ever sees or fills in. Form-filling bots fill everything,
  // and a message with this set is quietly dropped instead of stored.
  const [website, setWebsite] = useState('')

  const update = (patch: Partial<ContactMessageDraft>) => {
    setValues((current) => ({ ...current, ...patch }))
    const touched = Object.keys(patch) as (keyof ContactMessageDraft)[]
    if (touched.some((key) => key in errors)) {
      setErrors((current) => {
        const next = { ...current }
        for (const key of touched) delete next[key as keyof MessageErrors]
        return next
      })
    }
  }

  const check = (): boolean => {
    const found = validateMessage(values)
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!check()) return
    const clean = normalizeMessage(values)
    if (website.trim()) {
      setSent(clean)
      return
    }
    setBusy(true)
    try {
      await repository.sendMessage(clean)
      setSent(clean)
      setValues(EMPTY)
    } catch (cause) {
      notify(
        cause instanceof ContentError
          ? cause.message
          : 'Your message could not be sent. Please try again, or call the academy.',
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  /** Demo mode: the button is a real mail link, validated on the way out. */
  const handToMailApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!check()) {
      event.preventDefault()
      return
    }
    setHandedToMail(true)
  }

  const topicOptions = MESSAGE_TOPICS.map((topic) => ({
    value: topic,
    label: MESSAGE_TOPIC_LABELS[topic],
  }))

  if (sent) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <PageIntro eyebrow="Get in touch" title="Message sent" />
        <Card className="space-y-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
            <Icon name="check" size={22} />
          </span>
          <p className="text-[0.95rem] leading-relaxed text-ink-800">
            Thanks, {sent.name}. The academy reads messages
            {settings.officeHours
              ? ` during office hours (${settings.officeHours})`
              : ' during office hours'}{' '}
            and will reply to <strong className="font-semibold">{sent.contact}</strong>.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" onClick={() => setSent(null)}>
              Send another message
            </Button>
            <LinkButton to="/" variant="ghost">
              Back to Home
            </LinkButton>
          </div>
        </Card>
      </Screen>
    )
  }

  if (!canDeliver && !academyEmail) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <PageIntro eyebrow="Get in touch" title="Message the academy" />
        <EmptyState
          title="Messaging is not set up yet"
          description="The academy has not added an email address to the app. Please call or ask at the front desk."
          action={
            <ExternalButton
              href={telHref(settings.phone)}
              icon="phone"
              variant="primary"
              disabledReason="The phone number has not been added yet"
            >
              Call the academy
            </ExternalButton>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="Get in touch"
        title="Message the academy"
        description={
          canDeliver
            ? 'Ask about a trial class, the schedule, an event — anything. Staff reply using the contact details you give.'
            : 'Write your message here and the app opens your mail app with it ready to send.'
        }
      />

      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
        <Card className="space-y-4">
          <TextField
            label="Your name"
            name="name"
            autoComplete="name"
            required
            maxLength={MESSAGE_LIMITS.name}
            value={values.name}
            onChange={(event) => update({ name: event.target.value })}
            error={errors.name}
          />
          <TextField
            label="Email or phone number"
            name="contact"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={MESSAGE_LIMITS.contact}
            hint="So the academy can reply."
            value={values.contact}
            onChange={(event) => update({ contact: event.target.value })}
            error={errors.contact}
          />
          <SelectField
            label="What is it about?"
            name="topic"
            value={values.topic}
            onChange={(event) => update({ topic: event.target.value as MessageTopic })}
            options={topicOptions}
          />
          <TextArea
            label="Your message"
            name="body"
            required
            rows={6}
            maxLength={MESSAGE_LIMITS.body}
            hint={`${values.body.length} / ${MESSAGE_LIMITS.body}`}
            value={values.body}
            onChange={(event) => update({ body: event.target.value })}
            error={errors.body}
          />
          <div className="hidden" aria-hidden="true">
            <label>
              Leave this field empty
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          {canDeliver ? (
            <Button type="submit" icon="mail" size="lg" disabled={busy}>
              {busy ? 'Sending…' : 'Send message'}
            </Button>
          ) : (
            <a
              href={messageMailto(academyEmail ?? '', values)}
              onClick={handToMailApp}
              className={cx(
                'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-crimson-600 px-5',
                'text-[0.9375rem] font-medium text-white transition-colors hover:bg-crimson-700 select-none',
              )}
            >
              <Icon name="mail" size={17} />
              Open in my mail app
            </a>
          )}
          <ExternalButton
            href={telHref(settings.phone)}
            icon="phone"
            variant="ghost"
            disabledReason="The phone number has not been added yet"
          >
            Prefer to call?
          </ExternalButton>
        </div>

        {handedToMail ? (
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-100">
            Your mail app should now be open with the message written for you — press Send there to
            deliver it. If nothing opened, email{' '}
            <a href={`mailto:${academyEmail}`} className="font-semibold underline">
              {academyEmail}
            </a>{' '}
            directly.
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-ink-400">
          Only what you type here is sent: your name, how to reach you, and the message. Nothing is
          saved on your phone. Please leave out medical or other sensitive details — bring those to
          the front desk instead.
        </p>
      </form>
    </Screen>
  )
}
