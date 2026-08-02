import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, CardLink, EmptyState, SectionHeading, Skeleton } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { CATEGORY_LABELS, headlineAnnouncement } from '@/domain/announcements'
import { nextEvent, relativeDayLabel } from '@/domain/events'
import { formatClock, formatDate, greeting, telHref } from '@/domain/format'
import { effectiveTimes, formatTimeRange, upcomingToday, weekdayLabel, isoWeekday } from '@/domain/schedule'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { useInstallPrompt } from '@/pwa/usePwa'
import { Screen } from '@/components/layout/PageIntro'

/**
 * Home is a dashboard, not a menu: what is happening today, what is next, and
 * what the academy most recently said.
 */
export function HomeScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  useDocumentTitle('')

  const todayClasses = upcomingToday(bundle.schedule, now)
  const allToday = bundle.schedule.filter((entry) => entry.dayOfWeek === isoWeekday(now) && entry.published)
  const featuredEvent = nextEvent(bundle.events, now)
  const headline = headlineAnnouncement(bundle.announcements, now)
  const { settings } = bundle

  return (
    <div>
      {/* Hero — continues the dark header for a single confident surface. */}
      <section className="hero-grain px-4 pt-4 pb-8 text-white md:px-6 md:pt-6 md:pb-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-gold-400">{greeting(now)}</p>
          <h1 className="mt-1 text-[1.7rem] leading-tight font-extrabold tracking-tight sm:text-4xl">
            Welcome to {settings.academyName}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
            {settings.tagline
              ? settings.tagline
              : 'Class times, academy updates, events and student resources — all in one place.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton to="/schedule" icon="calendar" variant="primary">
              Today&rsquo;s classes
            </LinkButton>
            <LinkButton to="/updates" icon="megaphone" variant="secondary">
              Academy updates
            </LinkButton>
          </div>
        </div>
      </section>

      <Screen className="mx-auto max-w-3xl">
        <InstallNudge />

        {/* ------------------------------------------------ today's classes */}
        <section>
          <SectionHeading
            eyebrow={weekdayLabel(isoWeekday(now))}
            title="Classes today"
            action={
              <Link
                to="/schedule"
                className="flex items-center gap-1 text-sm font-semibold text-crimson-700"
              >
                Full schedule <Icon name="chevronRight" size={16} />
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : todayClasses.length ? (
            <ul className="space-y-2">
              {todayClasses.slice(0, 4).map((entry) => {
                const times = effectiveTimes(entry)
                return (
                  <li key={entry.id}>
                    <Card className="flex items-center gap-3.5 py-3.5">
                      <span className="flex w-[4.6rem] shrink-0 flex-col items-center rounded-xl bg-ink-900 px-2 py-2 text-white">
                        <span className="text-[0.95rem] leading-none font-bold">
                          {formatTimeRange(times.start, times.end).split('–')[0].trim()}
                        </span>
                        <span className="mt-1 text-[0.6rem] font-semibold tracking-wide text-white/60 uppercase">
                          {entry.status === 'cancelled' ? 'Cancelled' : 'Start'}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-ink-900">{entry.className}</span>
                        <span className="block text-sm text-ink-500">
                          {formatTimeRange(times.start, times.end)}
                          {entry.ageRange ? ` · ${entry.ageRange}` : ''}
                        </span>
                      </span>
                      {entry.status === 'cancelled' ? (
                        <Badge tone="red">Cancelled</Badge>
                      ) : entry.status === 'changed' ? (
                        <Badge tone="warning">Time changed</Badge>
                      ) : null}
                    </Card>
                  </li>
                )
              })}
            </ul>
          ) : allToday.length ? (
            <EmptyState
              icon="check"
              title="Today's classes are finished"
              description="Check the full schedule for the rest of the week."
              action={
                <LinkButton to="/schedule" variant="secondary" size="sm">
                  See the week
                </LinkButton>
              }
            />
          ) : (
            <EmptyState
              icon="calendar"
              title="No classes scheduled today"
              description="Take a look at the weekly schedule to plan your next class."
              action={
                <LinkButton to="/schedule" variant="secondary" size="sm">
                  See the week
                </LinkButton>
              }
            />
          )}
        </section>

        {/* -------------------------------------------------- next event */}
        <section>
          <SectionHeading
            title="Next event"
            action={
              <Link
                to="/events"
                className="flex items-center gap-1 text-sm font-semibold text-crimson-700"
              >
                All events <Icon name="chevronRight" size={16} />
              </Link>
            }
          />
          {loading ? (
            <Skeleton className="h-32" />
          ) : featuredEvent ? (
            <CardLink to={`/events/${featuredEvent.id}`} className="overflow-hidden">
              {featuredEvent.imageUrl ? (
                <img
                  src={featuredEvent.imageUrl}
                  alt=""
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="p-4 sm:p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="dark" icon="calendar">
                    {formatDate(featuredEvent.startAt)}
                  </Badge>
                  {relativeDayLabel(featuredEvent.startAt, now) ? (
                    <Badge tone="gold">{relativeDayLabel(featuredEvent.startAt, now)}</Badge>
                  ) : null}
                  {featuredEvent.isSample ? <SampleBadge /> : null}
                </div>
                <h3 className="text-lg font-bold text-ink-900">{featuredEvent.title}</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {featuredEvent.allDay ? 'All day' : formatClock(featuredEvent.startAt)}
                  {featuredEvent.location ? ` · ${featuredEvent.location}` : ''}
                </p>
                <p className="clamp-2 mt-2 text-sm leading-relaxed text-ink-600">
                  {featuredEvent.description}
                </p>
              </div>
            </CardLink>
          ) : (
            <EmptyState
              icon="star"
              title="No events posted yet"
              description="When the academy adds an event you will see it here first."
            />
          )}
        </section>

        {/* ------------------------------------------------ latest update */}
        <section>
          <SectionHeading
            title="Latest update"
            action={
              <Link
                to="/updates"
                className="flex items-center gap-1 text-sm font-semibold text-crimson-700"
              >
                All updates <Icon name="chevronRight" size={16} />
              </Link>
            }
          />
          {loading ? (
            <Skeleton className="h-28" />
          ) : headline ? (
            <CardLink to={`/updates/${headline.id}`} className="p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {headline.pinned ? (
                  <Badge tone="red" icon="bookmark">
                    Pinned
                  </Badge>
                ) : null}
                <Badge tone="neutral">{CATEGORY_LABELS[headline.category]}</Badge>
                {headline.isSample ? <SampleBadge /> : null}
              </div>
              <h3 className="text-base font-bold text-ink-900">{headline.title}</h3>
              <p className="clamp-3 mt-1.5 text-sm leading-relaxed text-ink-600">{headline.body}</p>
              <p className="mt-3 text-xs font-semibold text-ink-400">
                {formatDate(headline.publishedAt)}
              </p>
            </CardLink>
          ) : (
            <EmptyState
              icon="megaphone"
              title="No announcements yet"
              description="Academy news will appear here as soon as it is posted."
            />
          )}
        </section>

        {/* ----------------------------------------------- quick actions */}
        <section>
          <SectionHeading title="Quick actions" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <QuickAction to="/schedule" icon="calendar" label="Schedule" />
            <QuickAction to="/learn/curriculum" icon="play" label="Curriculum" />
            <QuickAction to="/more/contact" icon="mail" label="Contact" />
            <QuickExternal
              href={settings.mapUrl}
              icon="pin"
              label="Directions"
              disabledReason="The academy address has not been added yet"
            />
            <QuickExternal
              href={telHref(settings.phone)}
              icon="phone"
              label="Call"
              disabledReason="The academy phone number has not been added yet"
            />
            <QuickAction to="/learn" icon="book" label="Learn" />
          </div>
        </section>
      </Screen>
    </div>
  )
}

function QuickAction({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-[86px] flex-col items-start justify-between rounded-2xl border border-ink-100 bg-white p-3.5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-crimson-50 text-crimson-700">
        <Icon name={icon} size={19} />
      </span>
      <span className="text-sm font-bold text-ink-900">{label}</span>
    </Link>
  )
}

function QuickExternal({
  href,
  icon,
  label,
  disabledReason,
}: {
  href?: string
  icon: IconName
  label: string
  disabledReason: string
}) {
  const className =
    'flex min-h-[86px] flex-col items-start justify-between rounded-2xl border border-ink-100 bg-white p-3.5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]'
  if (!href) {
    // Unavailable, but still readable: a dashed outline says "not ready yet"
    // without dimming the label below an accessible contrast ratio.
    return (
      <div
        className="flex min-h-[86px] flex-col items-start justify-between rounded-2xl border border-dashed border-ink-200 bg-white/60 p-3.5"
        title={disabledReason}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
          <Icon name={icon} size={19} />
        </span>
        <span className="text-sm font-bold text-ink-500">{label}</span>
        <span className="sr-only">{disabledReason}</span>
      </div>
    )
  }
  const inPage = href.startsWith('tel:') || href.startsWith('mailto:')
  return (
    <a
      href={href}
      target={inPage ? undefined : '_blank'}
      rel={inPage ? undefined : 'noopener noreferrer'}
      className={className}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-crimson-50 text-crimson-700">
        <Icon name={icon} size={19} />
      </span>
      <span className="text-sm font-bold text-ink-900">{label}</span>
    </a>
  )
}

/** Small, dismissible install invitation — never a blocking interstitial. */
function InstallNudge() {
  const install = useInstallPrompt()
  if (install.isInstalled || install.dismissed) return null
  if (!install.canPrompt && !install.isIos) return null

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-ink-900 p-3.5 text-white shadow-[var(--shadow-soft)]">
      {/* The icon is decorative — drop it on narrow phones so the copy fits. */}
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold-400 sm:flex">
        <Icon name="download" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Add LMAA to your phone</p>
        <p className="text-xs text-white/70">Opens faster, works like a normal app.</p>
      </div>
      {install.canPrompt ? (
        <Button size="sm" variant="primary" onClick={() => void install.promptInstall()}>
          Install
        </Button>
      ) : (
        <LinkButton size="sm" variant="secondary" to="/more/install">
          How to
        </LinkButton>
      )}
      <button
        type="button"
        onClick={install.dismiss}
        aria-label="Dismiss install suggestion"
        className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
