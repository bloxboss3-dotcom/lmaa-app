import { useMemo, useState } from 'react'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Rows, Skeleton } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/domain/format'
import {
  WEEKDAYS,
  availableLevels,
  effectiveTimes,
  entriesForDay,
  formatTime,
  formatTimeRange,
  isoWeekday,
  minutesOfDay,
  nextClassDay,
  noticeAppliesOn,
  toIsoDate,
  weekdayLabel,
} from '@/domain/schedule'
import type { ScheduleEntry, Weekday } from '@/domain/types'
import { STORAGE_KEYS } from '@/lib/storage'
import { cx } from '@/lib/cx'
import { useDocumentTitle, useNow, useStoredState } from '@/lib/hooks'

type DaySelection = Weekday | 'week'

interface StoredFilters {
  program: string
  level: string
}

/**
 * The schedule is the screen families open most, so the classes start as high
 * up as possible: one day strip, then the list. Program and level filters are
 * folded away because most people never touch them.
 */
export function ScheduleScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  const today = isoWeekday(now)
  const todayIso = toIsoDate(now)

  // Null until a family picks a day, so the default can follow the timetable
  // once it loads instead of being frozen at first render.
  const [chosenDay, setChosenDay] = useState<DaySelection | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useStoredState<StoredFilters>(STORAGE_KEYS.scheduleFilters, {
    program: 'all',
    level: 'all',
  })
  useDocumentTitle('Class schedule')

  const levels = useMemo(() => availableLevels(bundle.schedule), [bundle.schedule])
  const filtersActive = filters.program !== 'all' || filters.level !== 'all'

  /**
   * Opening the schedule on a Sunday and being shown an empty Sunday is a
   * useless first screen, so a closed day falls forward to the next day that
   * teaches. An explicit tap always wins.
   */
  const defaultDay = useMemo<DaySelection>(() => {
    if (entriesForDay(bundle.schedule, today).length) return today
    return nextClassDay(bundle.schedule, now, 0)?.day ?? today
  }, [bundle.schedule, today, now])
  const day = chosenDay ?? defaultDay

  const matches = useMemo(
    () => (entry: ScheduleEntry) => {
      if (filters.program !== 'all' && entry.programSlug !== filters.program) return false
      if (filters.level !== 'all' && entry.level !== filters.level) return false
      return true
    },
    [filters.program, filters.level],
  )

  const daysToShow: Weekday[] = day === 'week' ? WEEKDAYS.map((entry) => entry.value) : [day]
  const daysKey = daysToShow.join(',')

  const groups = useMemo(
    () =>
      daysToShow.map((value) => ({
        day: value,
        entries: entriesForDay(bundle.schedule, value).filter(matches),
      })),
    [bundle.schedule, matches, daysKey],
  )

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nextUpId =
    day === today || day === 'week'
      ? entriesForDay(bundle.schedule, today)
          .filter(matches)
          .find(
            (entry) =>
              minutesOfDay(effectiveTimes(entry).start) >= nowMinutes &&
              entry.status !== 'cancelled',
          )?.id
      : undefined

  const totalShown = groups.reduce((sum, group) => sum + group.entries.length, 0)

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro eyebrow={formatDate(now)} title="Class schedule" />

      {/* Day strip. Seven equal columns rather than a scrolling row: a strip
          that runs off the edge of a phone hides the days nobody scrolls to. */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((entry) => {
          const active = day === entry.value
          const teaches = entriesForDay(bundle.schedule, entry.value).length > 0
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setChosenDay(entry.value)}
              aria-pressed={active}
              aria-label={`${entry.label}${teaches ? '' : ' — no classes'}`}
              className={cx(
                'flex min-h-11 flex-col items-center justify-center rounded-xl border py-1.5 transition-colors',
                active
                  ? 'border-crimson-600 bg-crimson-600 text-white'
                  : teaches
                    ? 'border-ink-100 bg-surface text-ink-700 hover:bg-ink-50'
                    // ink-400 rather than ink-300: a closed day still has to be
                  // legible, not just visibly quieter.
                  : 'border-ink-100 bg-transparent text-ink-400',
              )}
            >
              <span className="text-[0.6875rem] font-semibold tracking-wide uppercase">
                {entry.short}
              </span>
              <span
                className={cx(
                  'mt-1 h-1 w-1 rounded-full',
                  entry.value === today ? (active ? 'bg-white' : 'bg-crimson-600') : 'bg-transparent',
                )}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      {/* Filters stay out of the way until someone wants them. */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="flex min-h-9 items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-900"
          >
            <Icon name="filter" size={15} />
            {filtersActive ? 'Filters on' : 'Filter'}
            <Icon
              name="chevronDown"
              size={14}
              className={cx('transition-transform', filtersOpen && 'rotate-180')}
            />
          </button>

          <button
            type="button"
            onClick={() => setChosenDay(day === 'week' ? defaultDay : 'week')}
            aria-pressed={day === 'week'}
            className={cx(
              'min-h-9 rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors',
              day === 'week'
                ? 'border-crimson-600 bg-crimson-600 text-white'
                : 'border-ink-200 bg-surface text-ink-700 hover:bg-ink-50',
            )}
          >
            All week
          </button>
        </div>

        {filtersOpen ? (
          <div className="mt-3 grid gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-surface p-3 sm:grid-cols-2">
            <SelectField
              label="Program"
              value={filters.program}
              onChange={(event) => setFilters({ ...filters, program: event.target.value })}
              options={[
                { value: 'all', label: 'All programs' },
                ...bundle.programs.map((program) => ({
                  value: program.slug,
                  label: program.name,
                })),
              ]}
            />
            <SelectField
              label="Level"
              value={filters.level}
              onChange={(event) => setFilters({ ...filters, level: event.target.value })}
              options={[
                { value: 'all', label: 'Any level' },
                ...levels.map((level) => ({ value: level, label: level })),
              ]}
            />
            {filtersActive ? (
              <div className="sm:col-span-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFilters({ program: 'all', level: 'all' })}
                >
                  Clear filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : totalShown === 0 ? (
        <EmptyState
          title={
            filtersActive
              ? 'No classes match these filters'
              : day === 'week'
                ? 'No classes published yet'
                : `No classes on ${weekdayLabel(day as Weekday)}`
          }
          description={filtersActive ? undefined : 'Try another day, or view the whole week.'}
          action={
            filtersActive ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setFilters({ program: 'all', level: 'all' })}
              >
                Clear filters
              </Button>
            ) : day !== 'week' ? (
              <Button size="sm" variant="secondary" onClick={() => setChosenDay('week')}>
                View the week
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {groups
            .filter((group) => day !== 'week' || group.entries.length > 0)
            .map((group) => (
              <section key={group.day}>
                {day === 'week' ? (
                  <h2 className="eyebrow mb-2">
                    {weekdayLabel(group.day)}
                    {group.day === today ? ' · Today' : ''}
                  </h2>
                ) : null}
                <Rows>
                  {group.entries.map((entry) => (
                    <ClassRow
                      key={entry.id}
                      entry={entry}
                      todayIso={todayIso}
                      isNext={entry.id === nextUpId && group.day === today}
                    />
                  ))}
                </Rows>
              </section>
            ))}
        </div>
      )}
    </Screen>
  )
}

function ClassRow({
  entry,
  todayIso,
  isNext,
}: {
  entry: ScheduleEntry
  todayIso: string
  isNext?: boolean
}) {
  const times = effectiveTimes(entry)
  const cancelled = entry.status === 'cancelled'
  const noticeActive = noticeAppliesOn(entry, todayIso)

  return (
    <div
      className={cx(
        'px-4 py-3',
        isNext && 'border-l-[3px] border-crimson-600 bg-gradient-to-r from-crimson-50 to-transparent',
      )}
    >
      <div className="flex items-baseline gap-3">
        <span
          className={cx(
            'w-[4.75rem] shrink-0 tabular-nums',
            cancelled ? 'text-ink-400 line-through' : 'text-ink-900',
          )}
        >
          <span className="block text-sm font-semibold">{formatTime(times.start)}</span>
          <span className="block text-xs text-ink-400">{formatTime(times.end)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cx('font-medium', cancelled ? 'text-ink-400 line-through' : 'text-ink-900')}
            >
              {entry.className}
            </h3>
            {isNext && !cancelled ? <Badge tone="red">Up next</Badge> : null}
          </div>
          <p className="text-sm text-ink-500">
            {[entry.ageRange, entry.level].filter(Boolean).join(' · ')}
          </p>
          {entry.description ? (
            <p className="clamp-2 mt-1 text-sm text-ink-500">{entry.description}</p>
          ) : null}
          {entry.eligibility ? (
            <p className="mt-1 text-sm text-ink-500">{entry.eligibility}</p>
          ) : null}

          {entry.status !== 'scheduled' && noticeActive ? (
            <p
              className={cx(
                'mt-2 rounded-lg px-2.5 py-1.5 text-sm',
                cancelled ? 'bg-crimson-50 text-crimson-700' : 'bg-amber-50 text-amber-800',
              )}
            >
              <span className="font-medium">
                {cancelled ? 'Cancelled' : 'Time changed'}
                {entry.statusDate ? ` on ${formatDate(entry.statusDate)}` : ''}
              </span>
              {entry.statusNote ? ` — ${entry.statusNote}` : ''}
              {!cancelled && entry.newStartTime && entry.newEndTime
                ? ` Now ${formatTimeRange(entry.newStartTime, entry.newEndTime)}.`
                : ''}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
