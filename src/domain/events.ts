import type { AcademyEvent } from './types'

/** When the event finishes: the explicit end, or the start if none was given. */
export function eventEndsAt(event: AcademyEvent): number {
  const end = event.endAt ? Date.parse(event.endAt) : Number.NaN
  if (!Number.isNaN(end)) return end
  const start = Date.parse(event.startAt)
  if (Number.isNaN(start)) return 0
  // An all-day event with no end time runs to the end of its day.
  return event.allDay ? start + 24 * 60 * 60 * 1000 : start
}

export function isUpcoming(event: AcademyEvent, now: Date = new Date()): boolean {
  return eventEndsAt(event) >= now.getTime()
}

export function isEventVisible(event: AcademyEvent, now: Date = new Date()): boolean {
  if (!event.published) return false
  const publishAt = Date.parse(event.publishedAt)
  return !Number.isNaN(publishAt) && publishAt <= now.getTime()
}

export interface PartitionedEvents {
  upcoming: AcademyEvent[]
  past: AcademyEvent[]
}

/**
 * Split published events into "what's coming" (soonest first) and "what
 * happened" (most recent first).
 */
export function partitionEvents(
  events: AcademyEvent[],
  now: Date = new Date(),
): PartitionedEvents {
  const visible = events.filter((event) => isEventVisible(event, now))
  const upcoming = visible
    .filter((event) => isUpcoming(event, now))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const past = visible
    .filter((event) => !isUpcoming(event, now))
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))
  return { upcoming, past }
}

/** The event to surface on the home screen: featured wins, otherwise soonest. */
export function nextEvent(events: AcademyEvent[], now: Date = new Date()): AcademyEvent | undefined {
  const { upcoming } = partitionEvents(events, now)
  return upcoming.find((event) => event.featured) ?? upcoming[0]
}

/** "in 3 days" / "today" / "tomorrow" — friendlier than a bare date. */
export function relativeDayLabel(iso: string, now: Date = new Date()): string {
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return ''
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfDay(target) - startOfDay(now)) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1 && days <= 14) return `In ${days} days`
  if (days < -1 && days >= -14) return `${Math.abs(days)} days ago`
  return ''
}
