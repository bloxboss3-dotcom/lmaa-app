import { useParams } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, ExternalButton, LinkButton } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { RichText } from '@/components/ui/RichText'
import { useToast } from '@/components/ui/toastContext'
import { buildEventIcs, icsFileName } from '@/domain/calendar'
import { isEventVisible, isUpcoming } from '@/domain/events'
import { formatClock, formatLongDate } from '@/domain/format'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { getPlatform } from '@/native/platform'

export function EventDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { bundle, loading } = useContent()
  const now = useNow()
  const { notify } = useToast()

  const event = bundle.events.find((item) => item.id === id)
  useDocumentTitle(event?.title ?? 'Event')

  if (loading) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-52" />
      </Screen>
    )
  }

  if (!event || !isEventVisible(event, now)) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <EmptyState
          title="This event is not available"
          description="It may have been removed from the academy calendar."
          action={
            <LinkButton to="/events" variant="secondary" size="sm">
              Back to events
            </LinkButton>
          }
        />
      </Screen>
    )
  }

  const addToCalendar = () => {
    // Generated entirely in the browser — no server, no tracking.
    const ics = buildEventIcs(event, { now })
    getPlatform().saveFile(icsFileName(event), 'text/calendar;charset=utf-8', ics)
    notify('Calendar file downloaded. Open it to add the event.', 'success')
  }

  const share = async () => {
    const platform = getPlatform()
    const shared = await platform.share({
      title: event.title,
      text: `${event.title} — ${formatLongDate(event.startAt)}`,
      url: window.location.href,
    })
    if (!shared) {
      try {
        await navigator.clipboard.writeText(window.location.href)
        notify('Link copied.', 'success')
      } catch {
        notify('Sharing is not available on this device.', 'info')
      }
    }
  }

  const mapsUrl = event.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`
    : bundle.settings.mapUrl

  return (
    <article className="mx-auto max-w-2xl">
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt=""
          className="h-52 w-full object-cover sm:h-72 sm:rounded-b-3xl"
        />
      ) : null}

      <Screen>
        <header>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {event.featured ? <Badge tone="gold">Featured</Badge> : null}
            {isUpcoming(event, now) ? (
              <Badge tone="dark">Upcoming</Badge>
            ) : (
              <Badge tone="muted">Past event</Badge>
            )}
            {event.isSample ? <SampleBadge /> : null}
          </div>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">{event.title}</h1>
        </header>

        <Card className="space-y-3">
          <DetailRow icon="calendar" label="When">
            {formatLongDate(event.startAt)}
            <br />
            {event.allDay
              ? 'All day'
              : `${formatClock(event.startAt)}${event.endAt ? ` – ${formatClock(event.endAt)}` : ''}`}
          </DetailRow>
          {event.location || event.address ? (
            <DetailRow icon="pin" label="Where">
              {event.location}
              {event.address ? (
                <>
                  <br />
                  {event.address}
                </>
              ) : null}
            </DetailRow>
          ) : null}
          {event.audience ? (
            <DetailRow icon="users" label="Who">
              {event.audience}
            </DetailRow>
          ) : null}
        </Card>

        <RichText text={event.description} />

        <div className="flex flex-wrap gap-2">
          <Button icon="download" onClick={addToCalendar}>
            Add to calendar
          </Button>
          <ExternalButton
            href={mapsUrl}
            icon="pin"
            disabledReason="No address has been added for this event yet"
          >
            Directions
          </ExternalButton>
          {event.registrationUrl ? (
            <ExternalButton href={event.registrationUrl} icon="external" variant="dark">
              Register
            </ExternalButton>
          ) : null}
          {event.waiverUrl ? (
            <ExternalButton href={event.waiverUrl} icon="file">
              Waiver form
            </ExternalButton>
          ) : null}
          <Button variant="ghost" icon="share" onClick={() => void share()}>
            Share
          </Button>
        </div>

        <LinkButton to="/events" variant="ghost" icon="arrowLeft" size="sm">
          All events
        </LinkButton>
      </Screen>
    </article>
  )
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: 'calendar' | 'pin' | 'users'
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="text-[0.95rem] leading-relaxed font-medium text-ink-800">{children}</p>
      </div>
    </div>
  )
}
