import type {
  AcademyEvent,
  AcademySettings,
  Announcement,
  Faq,
  GalleryItem,
  LearningResource,
  Page,
  Program,
  ScheduleEntry,
  TimeOfDay,
  Weekday,
} from '@/domain/types'
import type { ContentBundle } from '../repository'

/**
 * Seed content for demo mode (no Supabase configured).
 *
 * Ground rules for this file:
 *  - The CLASS SCHEDULE is real information supplied by LMAA.
 *  - Everything else LMAA has not supplied yet is either left empty (so the UI
 *    shows an honest "not added yet" state) or clearly marked `isSample` /
 *    "[Sample]" so nobody mistakes it for real academy information.
 *  - No invented phone numbers, addresses, curriculum, or event details.
 *
 * Missing items are tracked in CONTENT_NEEDED.md.
 */

const EPOCH = '2026-01-01T00:00:00.000Z'

function stamps(createdAt = EPOCH) {
  return { createdAt, updatedAt: createdAt }
}

/** Shifts a date by whole days, keeping a fixed local time. */
function dayOffset(now: Date, days: number, hour: number, minute = 0): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, minute, 0, 0)
  return date.toISOString()
}

/* ------------------------------------------------------------------ settings */

export function seedSettings(): AcademySettings {
  return {
    academyName: "Lee's Martial Arts Academy",
    // Left blank on purpose: LMAA supplies the real wording. The UI copes.
    tagline: '',
    description:
      '[Placeholder] Add the official LMAA description here from Admin → Academy Info. ' +
      'One or two short paragraphs about the academy, the instructors and the programs works best.',
    phone: '',
    email: '',
    addressLines: [],
    mapUrl: '',
    websiteUrl: '',
    supportEmail: '',
    officeHours: '',
    social: {},
    updatedAt: EPOCH,
  }
}

/* ------------------------------------------------------------- announcements */

export function seedAnnouncements(now: Date): Announcement[] {
  return [
    {
      id: 'ann-welcome',
      title: 'Welcome to the LMAA Family App',
      body:
        "This is the academy's own app for schedules, updates, events and student resources.\n\n" +
        'Tap Updates to see academy news, Schedule for class times, Events for what is coming up, ' +
        'and Learn for curriculum videos and documents.\n\n' +
        'You can add this app to your phone home screen — see More → Install the app.',
      category: 'important',
      priority: 'high',
      pinned: true,
      published: true,
      publishedAt: dayOffset(now, -1, 9),
      actionLabel: 'See class schedule',
      actionUrl: '#/schedule',
      isSample: true,
      ...stamps(),
    },
    {
      id: 'ann-sample-testing',
      title: '[Sample] Belt testing information',
      body:
        'This is example content that shows how a testing announcement will look to families.\n\n' +
        'An administrator can edit or delete it in Admin → Updates, then post the real testing ' +
        'dates, times and requirements.',
      category: 'testing',
      priority: 'normal',
      pinned: false,
      published: true,
      publishedAt: dayOffset(now, -4, 17),
      isSample: true,
      ...stamps(),
    },
    {
      id: 'ann-sample-schedule',
      title: '[Sample] Holiday schedule change',
      body:
        'This is example content showing how a schedule change is posted.\n\n' +
        'Schedule notices can also be attached to a specific class from Admin → Schedule, which ' +
        'shows a "Cancelled" or "Time changed" badge directly on the class.',
      category: 'schedule',
      priority: 'normal',
      pinned: false,
      published: true,
      publishedAt: dayOffset(now, -9, 12),
      isSample: true,
      ...stamps(),
    },
  ]
}

/* -------------------------------------------------------------------- events */

export function seedEvents(now: Date): AcademyEvent[] {
  return [
    {
      id: 'evt-sample-upcoming',
      title: '[Sample event] Academy event',
      startAt: dayOffset(now, 14, 10),
      endAt: dayOffset(now, 14, 12),
      allDay: false,
      location: '',
      address: '',
      description:
        'This is example content so you can see how events look, including "Add to calendar" ' +
        'and "Directions".\n\n' +
        'An administrator should delete this in Admin → Events and add real LMAA events with ' +
        'their date, time, location, description and registration link.',
      audience: 'Example audience',
      featured: true,
      published: true,
      publishedAt: dayOffset(now, -7, 9),
      isSample: true,
      ...stamps(),
    },
    {
      id: 'evt-sample-past',
      title: '[Sample event] Past academy event',
      startAt: dayOffset(now, -21, 10),
      endAt: dayOffset(now, -21, 12),
      allDay: false,
      description:
        'Example content showing how finished events move into the "Past events" section ' +
        'automatically.',
      featured: false,
      published: true,
      publishedAt: dayOffset(now, -35, 9),
      isSample: true,
      ...stamps(),
    },
  ]
}

/* ------------------------------------------------------------------ schedule */

interface SeedClass {
  key: string
  className: string
  programSlug: string
  ageRange?: string
  level: string
  slots: { days: Weekday[]; start: TimeOfDay; end: TimeOfDay }[]
}

/**
 * Real LMAA class times supplied by the academy.
 * Classes/levels that are not listed here are unknown — see CONTENT_NEEDED.md.
 */
const SEED_CLASSES: SeedClass[] = [
  {
    key: 'little-tigers',
    className: 'Little Tigers',
    programSlug: 'little-tigers',
    ageRange: 'Ages 4–5',
    level: 'All levels',
    slots: [
      { days: [1, 3], start: '16:25', end: '16:55' },
      { days: [2, 4], start: '15:40', end: '16:10' },
    ],
  },
  {
    key: 'children-white-belt',
    className: 'Children White Belt',
    programSlug: 'children-white-belt',
    ageRange: 'Ages 6–12',
    level: 'White Belt',
    slots: [
      { days: [1, 3], start: '15:40', end: '16:20' },
      { days: [2, 4], start: '17:00', end: '17:40' },
    ],
  },
  {
    key: 'family-all-level',
    className: 'Family & All-Level',
    programSlug: 'family-all-level',
    ageRange: 'All ages',
    level: 'All levels',
    slots: [
      { days: [1, 3], start: '19:15', end: '19:55' },
      { days: [5], start: '18:40', end: '19:20' },
    ],
  },
  {
    key: 'teen-adult',
    className: 'Teen & Adult',
    programSlug: 'teen-adult',
    ageRange: 'Ages 13+',
    level: 'All levels',
    slots: [{ days: [1, 2, 3, 4], start: '20:00', end: '20:40' }],
  },
]

export function seedSchedule(): ScheduleEntry[] {
  const entries: ScheduleEntry[] = []
  let order = 0
  for (const seedClass of SEED_CLASSES) {
    for (const slot of seedClass.slots) {
      for (const day of slot.days) {
        entries.push({
          id: `sch-${seedClass.key}-${day}-${slot.start.replace(':', '')}`,
          className: seedClass.className,
          programSlug: seedClass.programSlug,
          dayOfWeek: day,
          startTime: slot.start,
          endTime: slot.end,
          ageRange: seedClass.ageRange,
          level: seedClass.level,
          status: 'scheduled',
          published: true,
          sortOrder: (order += 1),
          ...stamps(),
        })
      }
    }
  }
  return entries
}

/* ------------------------------------------------------------------ programs */

export function seedPrograms(): Program[] {
  const base = [
    {
      id: 'prg-little-tigers',
      name: 'Little Tigers',
      slug: 'little-tigers',
      ageRange: 'Ages 4–5',
      summary: 'Mon & Wed 4:25 PM · Tue & Thu 3:40 PM',
    },
    {
      id: 'prg-children-white-belt',
      name: 'Children White Belt',
      slug: 'children-white-belt',
      ageRange: 'Ages 6–12',
      summary: 'Mon & Wed 3:40 PM · Tue & Thu 5:00 PM',
    },
    {
      id: 'prg-family-all-level',
      name: 'Family & All-Level',
      slug: 'family-all-level',
      ageRange: 'All ages',
      summary: 'Mon & Wed 7:15 PM · Fri 6:40 PM',
    },
    {
      id: 'prg-teen-adult',
      name: 'Teen & Adult',
      slug: 'teen-adult',
      ageRange: 'Ages 13+',
      summary: 'Mon–Thu 8:00 PM',
    },
  ]

  return base.map((program, index) => ({
    ...program,
    description:
      '[Program description needed] Add the official description for this program in ' +
      'Admin → Programs. Class times shown here come from the academy schedule.',
    sortOrder: index + 1,
    published: true,
    isSample: true,
    ...stamps(),
  }))
}

/* ---------------------------------------------------------------------- FAQs */

export function seedFaqs(): Faq[] {
  const questions = [
    { question: 'What should my child wear to their first class?', category: 'New students' },
    { question: 'How do I know when my child is ready to test?', category: 'Testing' },
    { question: 'What happens if we miss a class?', category: 'Attendance' },
    { question: 'How do I contact the academy?', category: 'General' },
  ]
  return questions.map((item, index) => ({
    id: `faq-${index + 1}`,
    question: item.question,
    answer:
      '[Answer needed] An administrator can write the real answer in Admin → FAQs. ' +
      'This placeholder is only here to show how the FAQ section works.',
    category: item.category,
    sortOrder: index + 1,
    published: true,
    isSample: true,
    ...stamps(),
  }))
}

/* ---------------------------------------------------------------- resources */

export function seedResources(): LearningResource[] {
  const items: Omit<LearningResource, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'res-curriculum-white',
      title: '[Placeholder] White Belt curriculum video',
      description:
        'Add the real video link in Admin → Learning resources. LMAA must own or have permission ' +
        'to use any video added here.',
      type: 'video',
      collection: 'curriculum',
      program: 'Children White Belt',
      level: 'White Belt',
      sortOrder: 1,
      published: true,
      isSample: true,
    },
    {
      id: 'res-curriculum-tigers',
      title: '[Placeholder] Little Tigers curriculum video',
      description: 'Add the real video link in Admin → Learning resources.',
      type: 'video',
      collection: 'curriculum',
      program: 'Little Tigers',
      level: 'All levels',
      sortOrder: 2,
      published: true,
      isSample: true,
    },
    {
      id: 'res-binder-student',
      title: '[Placeholder] LMAA Student Binder',
      description:
        'Upload the current binder PDF and link it here from Admin → Learning resources.',
      type: 'document',
      collection: 'binder',
      sortOrder: 1,
      published: true,
      isSample: true,
    },
    {
      id: 'res-binder-terminology',
      title: '[Placeholder] Terminology sheet',
      description: 'Add the academy terminology document.',
      type: 'document',
      collection: 'binder',
      sortOrder: 2,
      published: true,
      isSample: true,
    },
    {
      id: 'res-resources-parent',
      title: '[Placeholder] Parent guide',
      description: 'Add a link or document that helps new families get started.',
      type: 'link',
      collection: 'resources',
      sortOrder: 1,
      published: true,
      isSample: true,
    },
  ]
  return items.map((item) => ({ ...item, ...stamps() }))
}

/* -------------------------------------------------------------------- pages */

export function seedPages(): Page[] {
  return [
    {
      id: 'page-about',
      slug: 'about',
      title: 'About LMAA',
      body:
        '[Placeholder] Add the LMAA story here from Admin → Pages.\n\n' +
        'Useful things to include: when the academy was founded, who teaches, the style taught, ' +
        'and what families can expect.',
      published: true,
      isSample: true,
      ...stamps(),
    },
    {
      id: 'page-privacy',
      slug: 'privacy',
      title: 'Privacy Policy',
      body:
        '[Placeholder — must be reviewed by LMAA before launch]\n\n' +
        'This app is built privacy-first. In this version:\n\n' +
        '- No account is required to use the app.\n' +
        '- No information about students or children is collected.\n' +
        '- No advertising or behavioural tracking is used.\n' +
        '- Your read/unread marks and app preferences are stored only on your own device.\n' +
        '- Administrator sign-in is limited to academy staff.\n\n' +
        'If push notifications or family accounts are added later, this policy must be updated ' +
        'before those features are switched on. Questions can be sent to the academy using the ' +
        'contact details on the Contact screen.',
      published: true,
      isSample: true,
      ...stamps(),
    },
    {
      id: 'page-support',
      slug: 'support',
      title: 'Support',
      body:
        '[Placeholder] Add the support instructions families should follow when something in the ' +
        'app does not work, plus the best contact method and the hours someone will reply.',
      published: true,
      isSample: true,
      ...stamps(),
    },
  ]
}

/* ------------------------------------------------------------------ gallery */

/** Empty on purpose: no third-party photos are used. LMAA supplies its own. */
export function seedGallery(): GalleryItem[] {
  return []
}

/* ------------------------------------------------------------------- bundle */

export function createSeedBundle(now: Date = new Date()): ContentBundle {
  return {
    settings: seedSettings(),
    announcements: seedAnnouncements(now),
    events: seedEvents(now),
    schedule: seedSchedule(),
    resources: seedResources(),
    programs: seedPrograms(),
    faqs: seedFaqs(),
    pages: seedPages(),
    gallery: seedGallery(),
  }
}
