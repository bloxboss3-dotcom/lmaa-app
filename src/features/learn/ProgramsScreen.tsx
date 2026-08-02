import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { RichText } from '@/components/ui/RichText'
import { formatTimeRange, sortScheduleEntries, weekdayLabel } from '@/domain/schedule'
import { useDocumentTitle } from '@/lib/hooks'

export function ProgramsScreen() {
  const { bundle, loading } = useContent()
  useDocumentTitle('Programs')

  const programs = [...bundle.programs].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="Academy"
        title="Programs"
        description="Every class the academy runs, who it is for and when it meets."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : programs.length ? (
        <ul className="space-y-3">
          {programs.map((program) => {
            const classes = sortScheduleEntries(
              bundle.schedule.filter((entry) => entry.programSlug === program.slug),
            )
            return (
              <li key={program.id}>
                <Card>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {program.ageRange ? <Badge tone="red">{program.ageRange}</Badge> : null}
                    {program.isSample ? <SampleBadge /> : null}
                  </div>
                  <h2 className="text-lg font-semibold text-ink-900">{program.name}</h2>
                  {program.summary ? (
                    <p className="mt-1 text-sm font-semibold text-ink-500">{program.summary}</p>
                  ) : null}
                  {program.description ? (
                    <RichText text={program.description} className="mt-2.5" />
                  ) : null}

                  {classes.length ? (
                    <div className="mt-3.5 rounded-xl bg-ink-50 p-3">
                      <p className="mb-1.5 eyebrow">
                        Class times
                      </p>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {classes.map((entry) => (
                          <li key={entry.id} className="flex justify-between gap-3">
                            <span className="font-medium">{weekdayLabel(entry.dayOfWeek)}</span>
                            <span className="text-ink-500">
                              {formatTimeRange(entry.startTime, entry.endTime)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-3.5">
                    <LinkButton to="/schedule" variant="secondary" size="sm" icon="calendar">
                      Open the schedule
                    </LinkButton>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          title="No programs listed yet"
          description="Program information will appear here once the academy adds it."
        />
      )}
    </Screen>
  )
}
