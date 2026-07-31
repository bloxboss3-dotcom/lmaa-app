import { useMemo, useState } from 'react'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { FilterChips, SegmentedControl, type ChipOption } from '@/components/ui/Chips'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/domain/format'
import {
  availableLevels,
  effectiveTimes,
  entriesForDay,
  formatTimeRange,
  groupByDay,
  isoWeekday,
  minutesOfDay,
  noticeAppliesOn,
  toIsoDate,
  weekdayLabel,
} from '@/domain/schedule'
import type { ScheduleEntry } from '@/domain/types'
import { STORAGE_KEYS } from '@/lib/storage'
import { useDocumentTitle, useNow, useStoredState } from '@/lib/hooks'

type View = 'today' | 'week'

interface StoredFilters {
  program: string
  level: string
}

export function ScheduleScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  const [view, setView] = useState<View>('today')
  const [filters, setFilters] = useStoredState<StoredFilters>(STORAGE_KEYS.scheduleFilters, {
    program: 'all',
    level: 'all',
  })
  useDocumentTitle('Class schedule')

  const today = isoWeekday(now)
  const todayIso = toIsoDate(now)

  const programOptions: ChipOption<string>[] = useMemo(
    () => [
      { value: 'all', label: 'All classes' },
      ...bundle.programs.map((program) => ({ value: program.slug, label: program.name })),
    ],
    [bundle.programs],
  )

  const levels = useMemo(() => availableLevels(bundle.schedule), [bundle.schedule])
  const levelOptions: ChipOption<string>[] = useMemo(
    () => [{ value: 'all', label: 'Any level' }, ...levels.map((level) => ({ value: level, label: level }))],
    [levels],
  )

  const filter = useMemo(
    () => ({ program: filters.program, level: filters.level }),
    [filters.program, filters.level],
  )
  const week = useMemo(() => groupByDay(bundle.schedule, filter), [bundle.schedule, filter])
  const todayEntries = useMemo(
    () => entriesForDay(bundle.schedule, today).filter(matchesFilter(filter)),
    [bundle.schedule, today, filter],
  )

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nextUpId = todayEntries.find(
    (entry) => minutesOfDay(effectiveTimes(entry).start) >= nowMinutes && entry.status !== 'cancelled',
  )?.id

  const filtersActive = filters.program !== 'all' || filters.level !== 'all'
  const clearFilters = () => setFilters({ program: 'all', level: 'all' })

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow={formatDate(now)}
        title="Class schedule"
        description="Class times for every program. Cancellations and time changes appear here first."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Schedule view"
          value={view}
          onChange={setView}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
          ]}
        />
        {filtersActive ? (
          <Button size="sm" variant="ghost" icon="close" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <FilterChips
          label="Filter by program"
          options={programOptions}
          value={filters.program}
          onChange={(program) => setFilters({ ...filters, program })}
        />
        {levelOptions.length > 2 ? (
          <FilterChips
            label="Filter by level"
            options={levelOptions}
            value={filters.level}
            onChange={(level) => setFilters({ ...filters, level })}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : view === 'today' ? (
        <section aria-label={`Classes on ${weekdayLabel(today)}`}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink-900">
            {weekdayLabel(today)}
            <Badge tone="red" uppercase>
              Today
            </Badge>
          </h2>
          {todayEntries.length ? (
            <ul className="space-y-2.5">
              {todayEntries.map((entry) => (
                <li key={entry.id}>
                  <ClassCard entry={entry} todayIso={todayIso} highlight={entry.id === nextUpId} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="calendar"
              title={
                filtersActive
                  ? 'No matching classes today'
                  : `No classes are scheduled on ${weekdayLabel(today)}`
              }
              description={
                filtersActive
                  ? 'Try clearing the filters or switch to the weekly view.'
                  : 'Switch to “This week” to see the full timetable.'
              }
              action={
                <Button size="sm" variant="secondary" onClick={() => setView('week')}>
                  See the whole week
                </Button>
              }
            />
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {week.every((day) => day.entries.length === 0) ? (
            <EmptyState
              icon="calendar"
              title="No classes match these filters"
              description="Try a different program or level."
              action={
                filtersActive ? (
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            week.map((day) => (
              <section key={day.day} aria-label={day.label}>
                <h2 className="mb-2.5 flex items-center gap-2 text-base font-bold text-ink-900">
                  {day.label}
                  {day.day === today ? (
                    <Badge tone="red" uppercase>
                      Today
                    </Badge>
                  ) : null}
                </h2>
                {day.entries.length ? (
                  <ul className="space-y-2.5">
                    {day.entries.map((entry) => (
                      <li key={entry.id}>
                        <ClassCard entry={entry} todayIso={todayIso} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-400">
                    No classes on {day.label}.
                  </p>
                )}
              </section>
            ))
          )}
        </div>
      )}
    </Screen>
  )
}

function matchesFilter(filter: { program: string; level: string }) {
  return (entry: ScheduleEntry) => {
    if (filter.program !== 'all' && entry.programSlug !== filter.program) return false
    if (filter.level !== 'all' && entry.level !== filter.level) return false
    return true
  }
}

interface ClassCardProps {
  entry: ScheduleEntry
  todayIso: string
  highlight?: boolean
}

function ClassCard({ entry, todayIso, highlight }: ClassCardProps) {
  const times = effectiveTimes(entry)
  const noticeActive = noticeAppliesOn(entry, todayIso)
  const cancelled = entry.status === 'cancelled'

  return (
    <Card
      className={cardClass(highlight, cancelled)}
      aria-label={`${entry.className}, ${formatTimeRange(times.start, times.end)}`}
    >
      <div className="flex gap-3.5">
        <div
          className={`flex w-[5.4rem] shrink-0 flex-col items-center justify-center rounded-xl px-2 py-2.5 ${
            cancelled ? 'bg-ink-100 text-ink-400' : 'bg-ink-900 text-white'
          }`}
        >
          <span className="text-[0.95rem] leading-tight font-bold">
            {formatTimeRange(times.start, times.end).split('–')[0].trim()}
          </span>
          <span className="mt-0.5 text-[0.7rem] leading-tight opacity-70">
            to {formatTimeRange(times.start, times.end).split('–')[1].trim()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-bold ${cancelled ? 'text-ink-400 line-through' : 'text-ink-900'}`}
            >
              {entry.className}
            </h3>
            {highlight && !cancelled ? (
              <Badge tone="gold" uppercase>
                Up next
              </Badge>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-ink-500">
            {[entry.ageRange, entry.level].filter(Boolean).join(' · ')}
          </p>

          {entry.description ? (
            <p className="clamp-2 mt-1.5 text-sm text-ink-600">{entry.description}</p>
          ) : null}

          {entry.eligibility ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-500">
              <Icon name="info" size={14} className="mt-px shrink-0" />
              {entry.eligibility}
            </p>
          ) : null}

          {entry.status !== 'scheduled' && noticeActive ? (
            <div
              className={`mt-2.5 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                cancelled
                  ? 'bg-crimson-50 text-crimson-800'
                  : 'bg-amber-50 text-amber-900'
              }`}
            >
              <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-bold">
                  {cancelled ? 'Class cancelled' : 'Time changed'}
                  {entry.statusDate ? ` on ${formatDate(entry.statusDate)}` : ''}
                </strong>
                {entry.statusNote ? ` — ${entry.statusNote}` : ''}
                {!cancelled && entry.newStartTime && entry.newEndTime ? (
                  <>
                    {' '}
                    Now {formatTimeRange(entry.newStartTime, entry.newEndTime)} (was{' '}
                    {formatTimeRange(entry.startTime, entry.endTime)}).
                  </>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function cardClass(highlight?: boolean, cancelled?: boolean): string {
  if (cancelled) return 'border-crimson-100 bg-crimson-50/30'
  if (highlight) return 'border-gold-300 ring-1 ring-gold-200'
  return ''
}
