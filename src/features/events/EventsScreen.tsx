import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { EmptyState, Rows, Skeleton } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { partitionEvents, relativeDayLabel } from '@/domain/events'
import { formatClock, formatDate } from '@/domain/format'
import type { AcademyEvent } from '@/domain/types'
import { cx } from '@/lib/cx'
import { useDocumentTitle, useNow } from '@/lib/hooks'

type Tab = 'upcoming' | 'past'

export function EventsScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  const [tab, setTab] = useState<Tab>('upcoming')
  useDocumentTitle('Events')

  const { upcoming, past } = useMemo(() => partitionEvents(bundle.events, now), [bundle.events, now])
  const shown = tab === 'upcoming' ? upcoming : past

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro title="Events" description="Testings, tournaments, camps and celebrations." />

      <div
        role="radiogroup"
        aria-label="Event list"
        className="inline-flex gap-1 rounded-lg bg-ink-50 p-1"
      >
        {(['upcoming', 'past'] as Tab[]).map((value) => {
          const active = value === tab
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTab(value)}
              className={cx(
                'min-h-8 rounded-md px-3 text-[0.8125rem] capitalize transition-colors',
                active ? 'bg-white font-medium text-ink-900 shadow-[var(--shadow-soft)]' : 'text-ink-500',
              )}
            >
              {value}
              <span className="ml-1.5 text-ink-400">
                {value === 'upcoming' ? upcoming.length : past.length}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : shown.length ? (
        <Rows>
          {shown.map((event) => (
            <EventRow key={event.id} event={event} now={now} past={tab === 'past'} />
          ))}
        </Rows>
      ) : tab === 'upcoming' ? (
        <EmptyState
          title="No upcoming events"
          description="Nothing on the calendar right now — new events appear here first."
        />
      ) : (
        <EmptyState
          title="No past events yet"
          description="Events move here automatically once they have finished."
        />
      )}
    </Screen>
  )
}

function EventRow({ event, now, past }: { event: AcademyEvent; now: Date; past: boolean }) {
  const relative = relativeDayLabel(event.startAt, now)
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50"
    >
      <span
        className={cx(
          'flex w-11 shrink-0 flex-col items-center rounded-lg py-1.5',
          past ? 'bg-ink-50 text-ink-500' : 'bg-crimson-50 text-crimson-800',
        )}
      >
        <span className="text-[0.625rem] font-medium tracking-wide uppercase">
          {new Date(event.startAt).toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span className="text-base leading-tight font-semibold">
          {new Date(event.startAt).getDate()}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <h2 className="truncate font-medium text-ink-900">{event.title}</h2>
          {event.isSample ? <SampleBadge /> : null}
          {event.featured && !past ? <Badge tone="gold">Featured</Badge> : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-ink-500">
          {relative && !past ? `${relative} · ` : `${formatDate(event.startAt)} · `}
          {event.allDay ? 'All day' : formatClock(event.startAt)}
          {event.location ? ` · ${event.location}` : ''}
        </span>
      </span>

      <Icon name="chevronRight" size={18} className="shrink-0 text-ink-300" />
    </Link>
  )
}
