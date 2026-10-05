import { useState } from 'react'
import { useRepository } from '@/app/context'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, ExternalButton } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { ContentError } from '@/data'
import { formatDateTime, formatRelative } from '@/domain/format'
import { MESSAGE_TOPIC_LABELS, replyHref } from '@/domain/messages'
import type { ContactMessage } from '@/domain/types'
import { cx } from '@/lib/cx'
import { useDocumentTitle } from '@/lib/hooks'
import { useInbox } from './useInbox'

type Filter = 'new' | 'all'

/**
 * The staff inbox for messages families send from the app.
 *
 * Nothing here is clever on purpose: read the message, reply with the family's
 * own email or phone number, mark it handled. The point is that a message can
 * never be lost between the app and the academy's email.
 */
export function AdminInboxScreen() {
  const { mode } = useRepository()
  const { notify } = useToast()
  const { messages, loading, error, unread, reload, setStatus } = useInbox()
  const [filter, setFilter] = useState<Filter>('new')
  const [busyId, setBusyId] = useState<string | null>(null)
  useDocumentTitle('Messages from families')

  const visible = (messages ?? []).filter((message) =>
    filter === 'new' ? message.status === 'new' : true,
  )

  const toggle = async (message: ContactMessage) => {
    setBusyId(message.id)
    try {
      await setStatus(message.id, message.status === 'new' ? 'handled' : 'new')
    } catch (cause) {
      notify(
        cause instanceof ContentError ? cause.message : 'Could not update this message.',
        'error',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">
            Messages from families
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Sent from the Message screen in the app. Reply with the contact details each family
            gave, then mark the message handled.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon="refresh" onClick={() => void reload()}>
          Refresh
        </Button>
      </div>

      {mode === 'demo' ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-100">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-gold-700" />
          <p>
            <strong className="font-semibold text-ink-900">Demo mode.</strong> Families&rsquo;
            messages open their own mail app instead of arriving here. Connect Supabase and messages
            land in this inbox (and, if you switch it on, in your email too).
          </p>
        </div>
      ) : null}

      <div className="flex gap-2" role="group" aria-label="Show">
        <FilterChip active={filter === 'new'} onClick={() => setFilter('new')}>
          New{unread ? ` · ${unread}` : ''}
        </FilterChip>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All{messages ? ` · ${messages.length}` : ''}
        </FilterChip>
      </div>

      {error ? (
        <EmptyState
          title="Could not load messages"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : visible.length ? (
        <ul className="space-y-3">
          {visible.map((message) => (
            <li key={message.id}>
              <MessageCard
                message={message}
                busy={busyId === message.id}
                onToggle={() => void toggle(message)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={filter === 'new' ? 'No new messages' : 'No messages yet'}
          description={
            filter === 'new'
              ? 'Everything families have sent has been handled.'
              : 'Messages families send from the app will appear here.'
          }
        />
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'min-h-9 rounded-full px-3.5 text-sm font-medium transition-colors',
        active
          ? 'bg-ink-900 text-canvas'
          : 'bg-surface text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50',
      )}
    >
      {children}
    </button>
  )
}

function MessageCard({
  message,
  busy,
  onToggle,
}: {
  message: ContactMessage
  busy: boolean
  onToggle: () => void
}) {
  const isNew = message.status === 'new'
  const reply = replyHref(message.contact, `Re: ${MESSAGE_TOPIC_LABELS[message.topic]}`)
  const replyIsEmail = reply?.startsWith('mailto:')

  return (
    <Card className={cx('space-y-3', isNew && 'border-l-4 border-l-crimson-600')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={isNew ? 'red' : 'neutral'}>{isNew ? 'New' : 'Handled'}</Badge>
        <Badge tone="muted">{MESSAGE_TOPIC_LABELS[message.topic]}</Badge>
        {message.isSample ? <SampleBadge /> : null}
        <time
          dateTime={message.createdAt}
          title={formatDateTime(message.createdAt)}
          className="ml-auto text-xs text-ink-400"
        >
          {formatRelative(message.createdAt)}
        </time>
      </div>

      <div>
        <p className="font-semibold text-ink-900">{message.name}</p>
        <p className="text-sm break-words text-ink-500">{message.contact}</p>
      </div>

      <p className="text-[0.95rem] leading-relaxed break-words whitespace-pre-line text-ink-800">
        {message.body}
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <ExternalButton
          href={reply}
          size="sm"
          icon={replyIsEmail ? 'mail' : 'phone'}
          disabledReason="This contact detail cannot be opened from here"
        >
          {replyIsEmail ? 'Reply by email' : 'Call back'}
        </ExternalButton>
        <Button
          size="sm"
          variant={isNew ? 'primary' : 'ghost'}
          icon={isNew ? 'check' : 'refresh'}
          onClick={onToggle}
          disabled={busy}
        >
          {isNew ? 'Mark as handled' : 'Mark as new'}
        </Button>
      </div>
      {message.handledAt ? (
        <p className="text-xs text-ink-400">Handled {formatDateTime(message.handledAt)}</p>
      ) : null}
    </Card>
  )
}
