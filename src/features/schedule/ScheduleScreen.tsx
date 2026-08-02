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

  const [day, setDay] = useState<DaySelection>(today)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useStoredState<StoredFilters>(STORAGE_KEYS.scheduleFilters, {
    program: 'all',
    level: 'all',
  })
  useDocumentTitle('Class schedule')

  const levels = useMemo(() => availableLevels(bundle.schedule), [bundle.schedule])
  const filtersActive = filters.program !== 'all' || filters.level !== 'all'

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

      {/* Day strip: one tap to any day, plus the whole week. */}
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:-mx-6 md:px-6">
        {WEEKDAYS.map((entry) => {
          const active = day === entry.value
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setDay(entry.value)}
              aria-pressed={active}
              className={cx(
                'flex min-w-[3.1rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition-colors',
                active
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-100 bg-white text-ink-600 hover:bg-ink-50',
              )}
            >
              <span className="text-[0.6875rem] tracking-wide uppercase">{entry.short}</span>
              {entry.value === today ? (
                <span
                  className={cx(
                    'mt-1 h-1 w-1 rounded-full',
                    active ? 'bg-white' : 'bg-crimson-600',
                  )}
                  aria-hidden="true"
                />
              ) : (
                <span className="mt-1 h-1 w-1" aria-hidden="true" />
              )}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setDay('week')}
          aria-pressed={day === 'week'}
          className={cx(
            'shrink-0 rounded-xl border px-3 text-[0.8125rem] transition-colors',
            day === 'week'
              ? 'border-ink-900 bg-ink-900 text-white'
              : 'border-ink-100 bg-white text-ink-600 hover:bg-ink-50',
          )}
        >
          All week
        </button>
      </div>

      {/* Filters stay out of the way until someone wants them. */}
      <div>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-ink-900"
        >
          <Icon name="filter" size={15} />
          {filtersActive ? 'Filters on' : 'Filter'}
          <Icon
            name="chevronDown"
            size={14}
            className={cx('transition-transform', filtersOpen && 'rotate-180')}
          />
        </button>

        {filtersOpen ? (
          <div className="mt-3 grid gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-white p-3 sm:grid-cols-2">
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
              <Button size="sm" variant="secondary" onClick={() => setDay('week')}>
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
    <div className={cx('px-4 py-3', isNext && 'bg-crimson-50/40')}>
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
                cancelled ? 'bg-crimson-50 text-crimson-800' : 'bg-amber-50 text-amber-900',
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
