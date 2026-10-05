import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, TextLink } from '@/components/ui/Button'
import { EmptyState, Rows, SectionHeading, Skeleton } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { headlineAnnouncement } from '@/domain/announcements'
import { nextMyClass } from '@/domain/myClasses'
import { useMyClasses } from '@/features/schedule/useMyClasses'
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage'
import { nextEvent, relativeDayLabel } from '@/domain/events'
import { formatClock, formatDate, formatRelative, telHref } from '@/domain/format'
import {
  effectiveTimes,
  formatTime,
  isoWeekday,
  nextClassDay,
  upcomingToday,
  weekdayLabel,
} from '@/domain/schedule'
import type { ScheduleEntry } from '@/domain/types'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { useInstallPrompt } from '@/pwa/usePwa'
import { Screen } from '@/components/layout/PageIntro'
import { HOME_PHOTOS } from '@/content/images'
import { PhotoStrip, type StripPhoto } from './PhotoStrip'

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
  // On a closed day (the academy shuts at weekends) showing an empty box is a
  // wasted screen. Fall forward to the next day that actually has classes.
  const upcomingDay = todayClasses.length
    ? null
    : nextClassDay(bundle.schedule, now, hadClassesToday ? 1 : 0)
  const nextDayWord = upcomingDay
    ? upcomingDay.daysAhead === 1
      ? 'tomorrow'
      : weekdayLabel(upcomingDay.day)
    : ''
  const featuredEvent = nextEvent(bundle.events, now)
  const headline = headlineAnnouncement(bundle.announcements, now)
  const { settings } = bundle

  // Chosen on this device only; never sent anywhere.
  const { mine } = useMyClasses()
  const myNext = nextMyClass(bundle.schedule, mine, now)
  const myNextWhen = myNext
    ? myNext.daysAhead === 0
      ? 'Today'
      : myNext.daysAhead === 1
        ? 'Tomorrow'
        : myNext.daysAhead === 7
          ? `Next ${weekdayLabel(myNext.entry.dayOfWeek)}`
          : weekdayLabel(myNext.entry.dayOfWeek)
    : ''

  // Install suggestions convert far better after a second visit than on the
  // first; a banner on someone's very first open mostly gets dismissed.
  const [visits] = useState(() => {
    const count = readJson<number>(STORAGE_KEYS.visitCount, 0) + 1
    writeJson(STORAGE_KEYS.visitCount, count)
    return count
  })

  // The academy's own photographs lead, the moment it publishes any; until
  // then the strip shows the app's illustrative pictures of the dojang.
  const galleryPhotos = [...bundle.gallery].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 8)
  const photos: StripPhoto[] = galleryPhotos.length
    ? galleryPhotos.map((item) => ({
        src: item.imageUrl,
        alt: item.title ?? '',
        caption: item.caption,
      }))
    : HOME_PHOTOS.map((src) => ({ src, alt: '' }))

  return (
    <Screen className="mx-auto max-w-2xl">
      {loading ? (
        <Skeleton className="aspect-[16/9] rounded-[var(--radius-card)] sm:aspect-[2/1]" />
      ) : (
        <PhotoStrip photos={photos} to={galleryPhotos.length ? '/more/gallery' : undefined} />
      )}

      <header>
        <p className="eyebrow eyebrow-accent">{formatDate(now)}</p>
        {/* The single loud moment on the screen — everything else stays quiet. */}
        <h1 className="display mt-2 text-ink-900">
          {todayClasses.length ? (
            <>
              <span className="text-crimson-600">
                {todayClasses.length} {todayClasses.length === 1 ? 'class' : 'classes'}
              </span>
              <br />
              left today
            </>
          ) : upcomingDay ? (
            <>
              {hadClassesToday ? "Today's classes are done" : 'Closed today'}
              <br />
              <span className="text-crimson-600">Back {nextDayWord}</span>
            </>
          ) : (
            <>
              No classes
              <br />
              <span className="text-crimson-600">scheduled yet</span>
            </>
          )}
        </h1>
      </header>

      {/* ------------------------------------------------ your next class */}
      {mine.length > 0 ? (
        <section>
          <SectionHeading
            title="Your next class"
            action={<TextLink to="/schedule">Change</TextLink>}
          />
          {myNext ? (
            <Rows>
              <Link
                to="/schedule"
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
                  <Icon name="star" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink-900">
                    {myNext.entry.className}
                  </span>
                  <span className="block text-sm text-ink-500">
                    {myNextWhen} · {formatTime(effectiveTimes(myNext.entry).start)}
                    {myNext.entry.status === 'changed' ? ' · time changed' : ''}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} className="shrink-0 text-ink-300" />
              </Link>
            </Rows>
          ) : (
            <EmptyState
              title="None of your classes are on this week"
              description="They may be cancelled or no longer on the timetable. Check the schedule."
            />
          )}
        </section>
      ) : null}

      {/* ------------------------------------- today's, or the next, classes */}
      <section>
        <SectionHeading
          title={
            todayClasses.length
              ? 'Today'
              : upcomingDay
                ? `Next classes · ${weekdayLabel(upcomingDay.day)}`
                : 'Class schedule'
          }
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
        ) : upcomingDay ? (
          <Rows>
            {upcomingDay.entries.slice(0, 4).map((entry) => (
              <ClassRow key={entry.id} entry={entry} />
            ))}
          </Rows>
        ) : (
          <EmptyState
            title="No classes in the timetable yet"
            description="An administrator can add the weekly class times in the admin area."
            action={
              <Link to="/schedule" className="text-sm font-medium text-crimson-700 hover:underline">
                See the week →
              </Link>
            }
          />
        )}
      </section>

      {/* ------------------------------------------------------ next event */}
      {/* Hidden entirely when there is nothing on: a box that says "no events"
          is an advert for an empty app, not information a parent can use. */}
      {featuredEvent || loading ? (
        <section>
          <SectionHeading
            title="Next event"
            action={<TextLink to="/events">All events</TextLink>}
          />
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
                    {relativeDayLabel(featuredEvent.startAt, now) ||
                      formatDate(featuredEvent.startAt)}
                    {featuredEvent.allDay
                      ? ' · All day'
                      : ` · ${formatClock(featuredEvent.startAt)}`}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} className="shrink-0 text-ink-300" />
              </Link>
            </Rows>
          ) : null}
        </section>
      ) : null}

      {/* ---------------------------------------------------- latest update */}
      {headline || loading ? (
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
          ) : null}
        </section>
      ) : null}

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
            to="/more/message"
            className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-ink-100 bg-surface text-ink-700 transition-colors hover:bg-ink-50"
          >
            <Icon name="mail" size={18} />
            <span className="text-xs font-medium">Message</span>
          </Link>
        </div>
      </section>

      {mine.length === 0 && bundle.schedule.length > 0 ? (
        <Link
          to="/schedule"
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-600 transition-colors hover:bg-ink-50"
        >
          <Icon name="star" size={17} className="shrink-0 text-gold-600" />
          <span className="min-w-0 flex-1">
            Tap the star on your classes in the schedule and your next one shows here first.
          </span>
          <Icon name="chevronRight" size={16} className="shrink-0 text-ink-300" />
        </Link>
      ) : null}

      <InstallNudge visits={visits} />
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
        <span
          className={`block truncate font-medium ${cancelled ? 'text-ink-400' : 'text-ink-900'}`}
        >
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
      className={`${base} border-ink-100 bg-surface text-ink-700 hover:bg-ink-50`}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </a>
  )
}

/** One quiet line at the bottom of the screen, never an interruption. */
function InstallNudge({ visits }: { visits: number }) {
  const install = useInstallPrompt()
  if (visits < 2) return null
  if (install.isInstalled || install.dismissed) return null
  if (!install.canPrompt && !install.isIos) return null

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-surface px-4 py-3">
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
