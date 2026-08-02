import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, TextLink } from '@/components/ui/Button'
import { EmptyState, Rows, SectionHeading, Skeleton } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { headlineAnnouncement } from '@/domain/announcements'
import { nextEvent, relativeDayLabel } from '@/domain/events'
import { formatClock, formatDate, formatRelative, greeting, telHref } from '@/domain/format'
import {
  effectiveTimes,
  formatTime,
  isoWeekday,
  upcomingToday,
  weekdayLabel,
} from '@/domain/schedule'
import type { ScheduleEntry } from '@/domain/types'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { useInstallPrompt } from '@/pwa/usePwa'
import { Screen } from '@/components/layout/PageIntro'

/**
 * Home answers one question first: "when is class?"
 *
 * The previous version spent the whole first screen on a welcome banner that
 * repeated the header and two buttons that duplicated the bottom navigation.
 * Now the greeting is a single line and today's classes start immediately.
 */
export function HomeScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  useDocumentTitle('')

  const todayClasses = upcomingToday(bundle.schedule, now)
  const hadClassesToday = bundle.schedule.some(
    (entry) => entry.published && entry.dayOfWeek === isoWeekday(now),
  )
  const featuredEvent = nextEvent(bundle.events, now)
  const headline = headlineAnnouncement(bundle.announcements, now)
  const { settings } = bundle

  return (
    <Screen className="mx-auto max-w-2xl">
      <header>
        <p className="eyebrow">
          {greeting(now)} · {formatDate(now)}
        </p>
        <h1 className="mt-1 text-[1.375rem] font-semibold tracking-tight text-ink-900">
          {todayClasses.length
            ? `${todayClasses.length} ${todayClasses.length === 1 ? 'class' : 'classes'} left today`
            : hadClassesToday
              ? "Today's classes are finished"
              : 'No classes today'}
        </h1>
      </header>

      {/* ------------------------------------------------- today's classes */}
      <section>
        <SectionHeading
          title={weekdayLabel(isoWeekday(now))}
          action={<TextLink to="/schedule">Full schedule</TextLink>}
        />
        {loading ? (
          <Skeleton className="h-24" />
        ) : todayClasses.length ? (
          <Rows>
            {todayClasses.slice(0, 4).map((entry) => (
              <ClassRow key={entry.id} entry={entry} />
            ))}
          </Rows>
        ) : (
          <EmptyState
            title={hadClassesToday ? 'Nothing else today' : 'No classes scheduled today'}
            description="The full weekly timetable is on the Schedule tab."
            action={
              <Link
                to="/schedule"
                className="text-sm font-medium text-crimson-700 hover:underline"
              >
                See the week →
              </Link>
            }
          />
        )}
      </section>

      {/* ------------------------------------------------------ next event */}
      <section>
        <SectionHeading title="Next event" action={<TextLink to="/events">All events</TextLink>} />
        {loading ? (
          <Skeleton className="h-20" />
        ) : featuredEvent ? (
          <Rows>
            <Link
              to={`/events/${featuredEvent.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50"
            >
              <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-ink-50 py-1.5">
                <span className="text-[0.625rem] font-medium tracking-wide text-ink-500 uppercase">
                  {new Date(featuredEvent.startAt).toLocaleDateString(undefined, {
                    month: 'short',
                  })}
                </span>
                <span className="text-base leading-tight font-semibold text-ink-900">
                  {new Date(featuredEvent.startAt).getDate()}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink-900">{featuredEvent.title}</span>
                  {featuredEvent.isSample ? <SampleBadge /> : null}
                </span>
                <span className="mt-0.5 block truncate text-sm text-ink-500">
                  {relativeDayLabel(featuredEvent.startAt, now) || formatDate(featuredEvent.startAt)}
                  {featuredEvent.allDay ? ' · All day' : ` · ${formatClock(featuredEvent.startAt)}`}
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="shrink-0 text-ink-300" />
            </Link>
          </Rows>
        ) : (
          <EmptyState title="No events posted yet" />
        )}
      </section>

      {/* ---------------------------------------------------- latest update */}
      <section>
        <SectionHeading
          title="Latest update"
          action={<TextLink to="/updates">All updates</TextLink>}
        />
        {loading ? (
          <Skeleton className="h-20" />
        ) : headline ? (
          <Rows>
            <Link
              to={`/updates/${headline.id}`}
              className="block px-4 py-3.5 transition-colors hover:bg-ink-50"
            >
              <span className="flex items-center gap-2">
                {headline.pinned ? <Badge tone="red">Pinned</Badge> : null}
                {headline.isSample ? <SampleBadge /> : null}
                <span className="ml-auto text-xs text-ink-400">
                  {formatRelative(headline.publishedAt, now)}
                </span>
              </span>
              <span className="mt-1.5 block font-medium text-ink-900">{headline.title}</span>
              <span className="clamp-2 mt-0.5 block text-sm text-ink-500">{headline.body}</span>
            </Link>
          </Rows>
        ) : (
          <EmptyState title="No announcements yet" />
        )}
      </section>

      {/* --------------------------------------------------- reach the gym */}
      {/* Only actions the bottom navigation cannot already do. */}
      <section>
        <SectionHeading title="Contact the academy" />
        <div className="grid grid-cols-3 gap-2">
          <ContactAction
            href={telHref(settings.phone)}
            icon="phone"
            label="Call"
            unavailable="No phone number added yet"
          />
          <ContactAction
            href={settings.mapUrl}
            icon="pin"
            label="Directions"
            unavailable="No map link added yet"
          />
          <Link
            to="/more/contact"
            className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-ink-100 bg-white text-ink-700 transition-colors hover:bg-ink-50"
          >
            <Icon name="mail" size={18} />
            <span className="text-xs font-medium">Contact</span>
          </Link>
        </div>
      </section>

      <InstallNudge />
    </Screen>
  )
}

function ClassRow({ entry }: { entry: ScheduleEntry }) {
  const times = effectiveTimes(entry)
  const cancelled = entry.status === 'cancelled'
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`w-[4.5rem] shrink-0 text-sm font-semibold tabular-nums ${
          cancelled ? 'text-ink-400 line-through' : 'text-ink-900'
        }`}
      >
        {formatTime(times.start)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${cancelled ? 'text-ink-400' : 'text-ink-900'}`}>
          {entry.className}
        </span>
        <span className="block truncate text-sm text-ink-500">
          {[entry.ageRange, `to ${formatTime(times.end)}`].filter(Boolean).join(' · ')}
        </span>
      </span>
      {cancelled ? <Badge tone="red">Cancelled</Badge> : null}
      {entry.status === 'changed' ? <Badge tone="warning">Time changed</Badge> : null}
    </div>
  )
}

function ContactAction({
  href,
  icon,
  label,
  unavailable,
}: {
  href?: string
  icon: IconName
  label: string
  unavailable: string
}) {
  const base =
    'flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border text-xs font-medium transition-colors'
  if (!href) {
    return (
      <div
        title={unavailable}
        className={`${base} border-dashed border-ink-200 bg-transparent text-ink-400`}
      >
        <Icon name={icon} size={18} />
        <span>{label}</span>
        <span className="sr-only">{unavailable}</span>
      </div>
    )
  }
  const inPage = href.startsWith('tel:') || href.startsWith('mailto:')
  return (
    <a
      href={href}
      target={inPage ? undefined : '_blank'}
      rel={inPage ? undefined : 'noopener noreferrer'}
      className={`${base} border-ink-100 bg-white text-ink-700 hover:bg-ink-50`}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </a>
  )
}

/** One quiet line at the bottom of the screen, never an interruption. */
function InstallNudge() {
  const install = useInstallPrompt()
  if (install.isInstalled || install.dismissed) return null
  if (!install.canPrompt && !install.isIos) return null

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-white px-4 py-3">
      <Icon name="download" size={18} className="shrink-0 text-ink-400" />
      <p className="min-w-0 flex-1 text-sm text-ink-600">Add LMAA to your home screen</p>
      {install.canPrompt ? (
        <Button size="sm" variant="secondary" onClick={() => void install.promptInstall()}>
          Install
        </Button>
      ) : (
        <Link to="/more/install" className="text-sm font-medium text-crimson-700 hover:underline">
          How
        </Link>
      )}
      <button
        type="button"
        onClick={install.dismiss}
        aria-label="Dismiss install suggestion"
        className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-300 hover:bg-ink-50"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}
