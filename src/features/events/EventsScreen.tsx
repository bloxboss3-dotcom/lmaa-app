import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { EmptyState, Skeleton } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/Chips'
import { Icon } from '@/components/ui/Icon'
import { partitionEvents, relativeDayLabel } from '@/domain/events'
import { formatClock, formatDate } from '@/domain/format'
import type { AcademyEvent } from '@/domain/types'
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
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="What's on"
        title="Events"
        description="Tournaments, testings, camps and academy celebrations."
      />

      <SegmentedControl
        label="Event list"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { value: 'past', label: 'Past', count: past.length },
        ]}
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : shown.length ? (
        <ul className="space-y-3">
          {shown.map((event) => (
            <li key={event.id}>
              <EventCard event={event} now={now} past={tab === 'past'} />
            </li>
          ))}
        </ul>
      ) : tab === 'upcoming' ? (
        <EmptyState
          icon="star"
          title="No upcoming events"
          description="Nothing is on the calendar right now. Check back soon — new events are posted here first."
        />
      ) : (
        <EmptyState
          icon="clock"
          title="No past events yet"
          description="Events move here automatically once they have finished."
        />
      )}
    </Screen>
  )
}

function EventCard({ event, now, past }: { event: AcademyEvent; now: Date; past: boolean }) {
  const relative = relativeDayLabel(event.startAt, now)
  return (
    <Link
      to={`/events/${event.id}`}
      className="block overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      {event.imageUrl ? (
        <img src={event.imageUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
      ) : null}
      <div className="flex gap-3.5 p-4 sm:p-5">
        <div
          className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-2 ${
            past ? 'bg-ink-100 text-ink-500' : 'bg-crimson-600 text-white'
          }`}
        >
          <span className="text-[0.65rem] font-bold tracking-widest uppercase">
            {new Date(event.startAt).toLocaleDateString(undefined, { month: 'short' })}
          </span>
          <span className="text-xl leading-none font-extrabold">
            {new Date(event.startAt).getDate()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {event.featured && !past ? <Badge tone="gold">Featured</Badge> : null}
            {relative && !past ? <Badge tone="neutral">{relative}</Badge> : null}
            {event.isSample ? <SampleBadge /> : null}
          </div>
          <h2 className="font-bold text-ink-900">{event.title}</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {formatDate(event.startAt)}
            {event.allDay ? ' · All day' : ` · ${formatClock(event.startAt)}`}
            {event.location ? ` · ${event.location}` : ''}
          </p>
          <p className="clamp-2 mt-1.5 text-sm leading-relaxed text-ink-600">{event.description}</p>
          <span className="mt-2.5 flex items-center gap-1 text-sm font-semibold text-crimson-700">
            Details <Icon name="chevronRight" size={15} />
          </span>
        </div>
      </div>
    </Link>
  )
}
