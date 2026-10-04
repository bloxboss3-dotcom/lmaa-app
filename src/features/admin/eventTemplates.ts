import type { IconName } from '@/components/ui/Icon'
import type { FormValues } from './validation'

/**
 * One-tap starting points for the events LMAA actually runs.
 *
 * Setting up an event is the single most repetitive admin job: the academy
 * holds the same handful of things every year and someone has to retype the
 * description each time. Every template below is built from what the academy
 * already says about itself on leesmartialartsacademy.com — nothing here
 * invents a new kind of event, and none of them carry a date. The date, the
 * time and the final wording are always the academy's to set.
 */

export interface EventTemplate {
  id: string
  label: string
  icon: IconName
  /** One line explaining when this is normally used. */
  note: string
  title: string
  description: string
  audience: string
  location: string
  /** Sensible default length in minutes, used to prefill the end time. */
  durationMinutes: number
  /** Suggested start time of day, 24h. */
  startHour: number
  startMinute: number
  allDay?: boolean
  featured?: boolean
  /** App-relative header image, when one exists for this kind of event. */
  imageUrl?: string
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'belt-testing',
    imageUrl: 'images/belts.jpg',
    label: 'Belt testing',
    icon: 'medal',
    note: 'Quarterly — March, June, September and December.',
    title: 'Belt testing',
    description:
      'Belt testing for students who have been invited to test.\n\n' +
      'Arrive early in a clean uniform. Parents are welcome to watch. If you cannot make this ' +
      'date, speak to Master Lee beforehand and we will arrange a make-up test.',
    audience: 'Invited students and their families',
    location: 'LMAA main dojang',
    durationMinutes: 120,
    startHour: 17,
    startMinute: 30,
    featured: true,
  },
  {
    id: 'summer-camp',
    imageUrl: 'images/event-summer-camp.jpg',
    label: 'Summer camp',
    icon: 'sparkle',
    note: 'Week-long themed camps through the summer.',
    title: 'Summer camp',
    description:
      'A week of themed camp days: Nerf battles, ninja obstacle courses, sparring camp and ' +
      'movie days.\n\n' +
      'Spaces are limited. Call (503) 682-2318 to book, and let us know about any allergies ' +
      'or medical needs when you do.',
    audience: 'Kids of all levels',
    location: 'LMAA main dojang',
    durationMinutes: 360,
    startHour: 9,
    startMinute: 0,
    featured: true,
  },
  {
    id: 'tournament',
    imageUrl: 'images/event-tournament.jpg',
    label: 'Tournament',
    icon: 'star',
    note: 'Area schools compete twice a year.',
    title: 'Tournament',
    description:
      'Area schools compete in forms, breaking and sparring.\n\n' +
      'Competitors should arrive in full uniform with their sparring gear. Families are very ' +
      'welcome to come and cheer.',
    audience: 'Competing students and their families',
    location: '',
    durationMinutes: 300,
    startHour: 9,
    startMinute: 0,
    featured: true,
  },
  {
    id: 'birthday-party',
    imageUrl: 'images/event-birthday-party.jpg',
    label: 'Birthday party',
    icon: 'sparkle',
    note: 'Bouncy house, obstacle course and board breaking.',
    title: 'Birthday party at LMAA',
    description:
      'A birthday party in the dojang: bouncy house, ninja obstacle course and a board break ' +
      'for every guest — and the birthday kid cuts the cake with a samurai sword.\n\n' +
      'Call (503) 682-2318 to book a date.',
    audience: 'Birthday guests',
    location: 'LMAA main dojang',
    durationMinutes: 120,
    startHour: 11,
    startMinute: 0,
  },
  {
    id: 'parents-day',
    label: 'Mom & Me / Dad & Me',
    icon: 'users',
    note: 'The Saturdays before Mother’s Day and Father’s Day.',
    title: 'Mom & Me / Dad & Me class',
    description:
      'Parents join their child on the mat for a special class. No experience needed — come in ' +
      'comfortable clothes and train together.',
    audience: 'Students with a parent',
    location: 'LMAA main dojang',
    durationMinutes: 60,
    startHour: 10,
    startMinute: 0,
  },
  {
    id: 'parents-night-out',
    label: 'Parents Night Out',
    icon: 'star',
    note: 'Pizza-and-games night for the kids.',
    title: 'Parents Night Out',
    description:
      'Drop the kids with us for pizza, games and martial arts fun while you get an evening ' +
      'off.\n\n' +
      'Spaces are limited — call (503) 682-2318 to reserve a spot.',
    audience: 'Enrolled students',
    location: 'LMAA main dojang',
    durationMinutes: 180,
    startHour: 18,
    startMinute: 0,
  },
  {
    id: 'halloween',
    label: 'Halloween party',
    icon: 'sparkle',
    note: 'The costume party.',
    title: 'Halloween party',
    description:
      'Our legendary costume party. Come in costume, bring your best moves.\n\n' +
      'Open to all students and their families.',
    audience: 'All students and families',
    location: 'LMAA main dojang',
    durationMinutes: 120,
    startHour: 18,
    startMinute: 0,
  },
  {
    id: 'holiday-potluck',
    imageUrl: 'images/event-holiday-potluck.jpg',
    label: 'Holiday potluck',
    icon: 'users',
    note: 'Year-end belt ceremony and feast.',
    title: 'Holiday potluck & belt ceremony',
    description:
      'Our year-end belt ceremony followed by a potluck feast. Bring a dish to share.\n\n' +
      'All students and families welcome.',
    audience: 'All students and families',
    location: 'LMAA main dojang',
    durationMinutes: 150,
    startHour: 17,
    startMinute: 30,
    featured: true,
  },
  {
    id: 'closure',
    imageUrl: 'images/event-closed.jpg',
    label: 'Academy closed',
    icon: 'info',
    note: 'A holiday or closure families need to plan around.',
    title: 'Academy closed',
    description: 'The academy is closed on this date. Classes resume as normal afterwards.',
    audience: 'All students and families',
    location: '',
    durationMinutes: 0,
    startHour: 0,
    startMinute: 0,
    allDay: true,
    featured: true,
  },
]

/** `2026-09-19T17:30` — the shape a `datetime-local` input expects. */
export function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Turns a template into form values, dated to the next occurrence of the
 * suggested time — never today, so an event is never accidentally created in
 * the past, and never far away either.
 */
export function applyTemplate(template: EventTemplate, now: Date = new Date()): FormValues {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 0, 0, 0, 0)
  start.setHours(template.startHour, template.startMinute, 0, 0)

  const values: FormValues = {
    title: template.title,
    description: template.description,
    audience: template.audience,
    location: template.location,
    allDay: Boolean(template.allDay),
    featured: Boolean(template.featured),
    startAt: toDateTimeLocal(start),
    // Draft, always. A template is a starting point, not a publish button.
    published: false,
  }

  if (template.imageUrl) values.imageUrl = template.imageUrl

  if (template.durationMinutes > 0 && !template.allDay) {
    const end = new Date(start.getTime() + template.durationMinutes * 60_000)
    values.endAt = toDateTimeLocal(end)
  }

  return values
}
