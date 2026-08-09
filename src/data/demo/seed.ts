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
 *  - Everything here is REAL academy information published by LMAA itself, at
 *    leesmartialartsacademy.com (contact details, hours, the weekly class
 *    schedule, the four programs, the FAQ answers, the tenets and the pledge).
 *    It is transcribed, not invented, and an administrator can edit any of it.
 *  - Where LMAA has not published something — curriculum videos, the student
 *    binder, dated events, photographs — the collection is left EMPTY so the UI
 *    shows an honest "not added yet" state. Nothing is faked to fill space.
 *  - The privacy policy is the one remaining placeholder and is marked as such:
 *    it must be reviewed and approved by the academy before launch.
 *
 * Outstanding items are tracked in CONTENT_NEEDED.md.
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
    tagline: 'Traditional Taekwondo & HapKiDo in Wilsonville since 2005',
    description:
      'Lee’s Martial Arts Academy has taught traditional Taekwondo and HapKiDo to Wilsonville ' +
      'families since 2005. Master C.Y. Lee holds a 6th Dan in both arts, and the academy is ' +
      'affiliated with Kukkiwon and World Taekwondo, so black belts earned here are recognised ' +
      'worldwide.\n\n' +
      'Classes run for every age from Little Tigers at 4 through to adults at 50+, and whole ' +
      'families have earned their black belts together on this mat.',
    phone: '(503) 682-2318',
    email: 'lmaa.wilsonville@gmail.com',
    addressLines: ['8263 SW Wilsonville Rd, Ste A', 'Wilsonville, OR 97070'],
    // Built from the academy's own address — opens in whichever maps app the
    // family has installed rather than pinning them to one provider.
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent("Lee's Martial Arts Academy, 8263 SW Wilsonville Rd, Wilsonville, OR 97070"),
    websiteUrl: 'https://www.leesmartialartsacademy.com',
    supportEmail: 'lmaa.wilsonville@gmail.com',
    officeHours: 'Monday – Friday, 1:00 – 8:40 PM · Closed Saturday & Sunday',
    social: { instagram: 'https://www.instagram.com/lmaa__wilsonville' },
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
        'This is the academy’s own app for class times, updates, events and student resources.\n\n' +
        'Tap Schedule for the full weekly timetable, Updates for academy news, Events for what is ' +
        'coming up, and Learn for programs, the belt journey and answers to common questions.\n\n' +
        'You can add the app to your phone’s home screen so it opens like any other app — see ' +
        'More → Install the app.',
      category: 'important',
      priority: 'normal',
      pinned: true,
      published: true,
      publishedAt: dayOffset(now, -1, 9),
      actionLabel: 'See the class schedule',
      actionUrl: '#/schedule',
      ...stamps(),
    },
  ]
}

/* -------------------------------------------------------------------- events */

/**
 * Empty on purpose.
 *
 * LMAA runs camps, birthday parties, tournaments, Mom & Me / Dad & Me days and
 * quarterly belt tests (March, June, September, December), but has not
 * published dates for any of them. Inventing dates for a belt test is exactly
 * the kind of thing a parent would plan their week around, so the Events screen
 * stays honestly empty until an administrator adds the real ones. The recurring
 * programming itself is described on the "Beyond class" page.
 */
export function seedEvents(): AcademyEvent[] {
  return []
}

/* ------------------------------------------------------------------ schedule */

interface SeedSlot {
  day: Weekday
  start: TimeOfDay
  end: TimeOfDay
  className: string
  programSlug?: string
  ageRange?: string
  /** Coarse grouping that drives the Schedule filter. */
  level: string
}

const WHITE = 'White belt'
const COLOUR = 'Colour belt'
const BLACK = 'Black belt'
const ALL = 'All levels'

const KIDS = 'kids-taekwondo'
const TIGERS = 'little-tigers'
const TEEN_ADULT = 'teen-adult'
const FAMILY = 'family-class'

/**
 * The real weekly timetable as published by the academy.
 *
 * Black-belt classes are deliberately left without a `programSlug`: they take
 * black belts of every age, so filing them under the children's or the adults'
 * program would mislead a parent using the program filter. The level filter
 * covers them instead.
 */
const SEED_SLOTS: SeedSlot[] = [
  // ---------------------------------------------------------------- Monday
  { day: 1, start: '15:40', end: '16:20', className: 'White Belt Only', programSlug: KIDS, level: WHITE },
  { day: 1, start: '16:25', end: '16:55', className: 'Little Tigers', programSlug: TIGERS, ageRange: 'Ages 4–5', level: ALL },
  { day: 1, start: '17:00', end: '17:40', className: 'Level I', programSlug: KIDS, level: COLOUR },
  { day: 1, start: '17:45', end: '18:25', className: 'Level II', programSlug: KIDS, level: COLOUR },
  { day: 1, start: '18:30', end: '19:10', className: 'Level III & IV', programSlug: KIDS, level: COLOUR },
  { day: 1, start: '19:15', end: '19:55', className: 'All Black Belt', level: BLACK },
  { day: 1, start: '20:00', end: '20:40', className: 'Teen, Adults & All Black Belts', programSlug: TEEN_ADULT, ageRange: 'Ages 13+', level: ALL },

  // --------------------------------------------------------------- Tuesday
  { day: 2, start: '15:40', end: '16:10', className: 'Little Tigers', programSlug: TIGERS, ageRange: 'Ages 4–5', level: ALL },
  { day: 2, start: '16:15', end: '16:55', className: 'Level II, III & IV', programSlug: KIDS, level: COLOUR },
  { day: 2, start: '17:00', end: '17:40', className: 'White Belt Only', programSlug: KIDS, level: WHITE },
  { day: 2, start: '17:45', end: '18:25', className: 'Level I', programSlug: KIDS, level: COLOUR },
  { day: 2, start: '18:30', end: '19:10', className: 'Foam Sword', programSlug: KIDS, level: COLOUR },
  { day: 2, start: '19:15', end: '19:55', className: 'All Black Belt', level: BLACK },
  { day: 2, start: '20:00', end: '20:40', className: 'Teen, Adults & All Black Belts', programSlug: TEEN_ADULT, ageRange: 'Ages 13+', level: ALL },

  // ------------------------------------------------------------- Wednesday
  { day: 3, start: '15:40', end: '16:20', className: 'White Belt Only', programSlug: KIDS, level: WHITE },
  { day: 3, start: '16:25', end: '16:55', className: 'Little Tigers', programSlug: TIGERS, ageRange: 'Ages 4–5', level: ALL },
  { day: 3, start: '17:00', end: '17:40', className: 'Level I', programSlug: KIDS, level: COLOUR },
  { day: 3, start: '17:45', end: '18:25', className: 'Level III & IV', programSlug: KIDS, level: COLOUR },
  { day: 3, start: '18:30', end: '19:10', className: 'All Black Belt', level: BLACK },
  { day: 3, start: '19:15', end: '19:55', className: 'Family & All Level', programSlug: FAMILY, ageRange: 'All ages', level: ALL },
  { day: 3, start: '20:00', end: '20:40', className: 'Teen, Adults & All Black Belts', programSlug: TEEN_ADULT, ageRange: 'Ages 13+', level: ALL },

  // -------------------------------------------------------------- Thursday
  { day: 4, start: '15:40', end: '16:10', className: 'Little Tigers', programSlug: TIGERS, ageRange: 'Ages 4–5', level: ALL },
  { day: 4, start: '16:15', end: '16:55', className: 'Level I', programSlug: KIDS, level: COLOUR },
  { day: 4, start: '17:00', end: '17:40', className: 'White Belt Only', programSlug: KIDS, level: WHITE },
  { day: 4, start: '17:45', end: '18:25', className: 'Level II', programSlug: KIDS, level: COLOUR },
  { day: 4, start: '18:30', end: '19:10', className: 'Black Belt Club', level: BLACK },
  { day: 4, start: '19:15', end: '19:55', className: 'All Black Belt', level: BLACK },
  { day: 4, start: '20:00', end: '20:40', className: 'Teen, Adults & All Black Belts', programSlug: TEEN_ADULT, ageRange: 'Ages 13+', level: ALL },

  // ---------------------------------------------------------------- Friday
  { day: 5, start: '15:40', end: '16:20', className: 'Level I & II', programSlug: KIDS, level: COLOUR },
  { day: 5, start: '16:25', end: '17:05', className: 'Level III & IV', programSlug: KIDS, level: COLOUR },
  { day: 5, start: '17:10', end: '17:50', className: 'All Black Belts', level: BLACK },
  { day: 5, start: '17:55', end: '18:35', className: 'Kids Sparring', programSlug: KIDS, level: COLOUR },
  { day: 5, start: '18:40', end: '19:20', className: 'Family & All Level', programSlug: FAMILY, ageRange: 'All ages', level: ALL },
  { day: 5, start: '19:25', end: '20:05', className: 'Teen/Adult Sparring & All Black Belts', programSlug: TEEN_ADULT, ageRange: 'Ages 13+', level: ALL },
]

export function seedSchedule(): ScheduleEntry[] {
  return SEED_SLOTS.map((slot, index) => ({
    id: `sch-${slot.day}-${slot.start.replace(':', '')}`,
    className: slot.className,
    programSlug: slot.programSlug,
    dayOfWeek: slot.day,
    startTime: slot.start,
    endTime: slot.end,
    ageRange: slot.ageRange,
    level: slot.level,
    status: 'scheduled' as const,
    published: true,
    sortOrder: index + 1,
    ...stamps(),
  }))
}

/* ------------------------------------------------------------------ programs */

export function seedPrograms(): Program[] {
  const base = [
    {
      id: 'prg-little-tigers',
      name: 'Little Tigers',
      slug: TIGERS,
      ageRange: 'Ages 4–5',
      summary: 'Thirty fast minutes, four days a week.',
      description:
        'First steps on the mat for ages 4 and 5. Fast-paced 30-minute classes that teach ' +
        'listening, balance, coordination and courtesy, disguised as the most fun your ' +
        '4-year-old has all week.\n\n' +
        'Meets Monday and Wednesday at 4:25 PM, and Tuesday and Thursday at 3:40 PM.',
    },
    {
      id: 'prg-kids-taekwondo',
      name: 'Kids Taekwondo',
      slug: KIDS,
      ageRange: 'Ages 6–12 · all belt levels',
      summary: 'White belt through to black, grouped by level.',
      description:
        'The heart of LMAA. Belt-by-belt goal setting that becomes a habit. Parents tell us the ' +
        'focus and respect carry straight into homework and chores.\n\n' +
        'Classes are grouped by level so nobody trains above their stage: White Belt Only for ' +
        'beginners, then Level I through Level IV, plus Kids Sparring and Foam Sword classes ' +
        'later in the week.',
    },
    {
      id: 'prg-teen-adult',
      name: 'Teen & Adult Taekwondo',
      slug: TEEN_ADULT,
      ageRange: 'Ages 13 – 50+',
      summary: 'Monday to Friday evenings at 8:00 PM.',
      description:
        'A complete system: Taekwondo enhanced by the flowing movements of HapKiDo. Cardio, ' +
        'flexibility, deep-breathing focus work and self-defence that responds when it matters, ' +
        'all the way up to the Black Belt Club.\n\n' +
        'Meets Monday to Thursday at 8:00 PM, with Teen/Adult Sparring on Friday at 7:25 PM.',
    },
    {
      id: 'prg-family-class',
      name: 'Family Class',
      slug: FAMILY,
      ageRange: 'Parents and kids together',
      summary: 'Wednesday 7:15 PM · Friday 6:40 PM.',
      description:
        'Train together, test together, grow together — just siblings, or the whole family as a ' +
        'team. Whole families have earned their black belts here.\n\n' +
        'There is a Family Program discount when more than one family member enrols together.',
    },
  ]

  return base.map((program, index) => ({
    ...program,
    sortOrder: index + 1,
    published: true,
    ...stamps(),
  }))
}

/* ---------------------------------------------------------------------- FAQs */

/** The academy's own published answers, transcribed verbatim in substance. */
export function seedFaqs(): Faq[] {
  const items: { question: string; answer: string; category: string }[] = [
    {
      category: 'Getting started',
      question: 'How young can my child start?',
      answer:
        'Little Tigers starts at age 4 and the children’s class at 6. Call (503) 682-2318 and ' +
        'we will work out the right fit together.',
    },
    {
      category: 'Getting started',
      question: 'Do we need any experience to start?',
      answer:
        'None. Every black belt in the school started exactly where you are — as a white belt on ' +
        'day one. Beginners join year-round and are placed by age and level.',
    },
    {
      category: 'Getting started',
      question: 'What should we wear to the first class?',
      answer:
        'Comfortable athletic clothes. That is it. We train barefoot on the mat, and we will ' +
        'sort out a uniform if you decide to continue. Arrive about 10 minutes early so we can ' +
        'welcome you properly.',
    },
    {
      category: 'Getting started',
      question: 'What actually happens at my child’s first class?',
      answer:
        'You arrive about 10 minutes early, meet the instructor, and your child joins the right ' +
        'class for their age while you watch from the parent seating. Classes are 30 to 40 ' +
        'minutes of warm-up, technique and games. Afterwards the instructor checks in with you ' +
        'about how it went. Parents are welcome to watch every class, not just the first one.',
    },
    {
      category: 'Getting started',
      question: 'How does the free trial work?',
      answer:
        'Four real classes over two weeks, completely free. Book online, call, or send a DM on ' +
        'Instagram, then show up and train.',
    },
    {
      category: 'About the training',
      question: 'What is Taekwondo, exactly?',
      answer:
        'Korea’s native martial art: literally "Tae" (foot), "Kwon" (hand), "Do" (the way). It ' +
        'emphasises kicking more than other martial arts, which makes it ideal for building a ' +
        'child’s balance, flexibility and endurance. At LMAA the curriculum is Taekwondo ' +
        'enhanced by HapKiDo, the "Art of Coordinated Power", which adds joint locks, escapes ' +
        'and flowing self-defence.',
    },
    {
      category: 'About the training',
      question: 'Is Taekwondo safe for young kids?',
      answer:
        'Safety comes first on our mat. Beginners learn control, balance and falling safely long ' +
        'before any partner work; sparring is optional and always in full protective gear under ' +
        'World Taekwondo rules; and classes are grouped by age and level so nobody trains above ' +
        'their stage.',
    },
    {
      category: 'About the training',
      question: 'Will martial arts make my child aggressive?',
      answer:
        'The opposite, and parents tell us this constantly. Taekwondo channels energy into focus ' +
        'and self-control. Students recite the LMAA Pledge every class, and respect for parents ' +
        'and teachers is trained as deliberately as any kick. Most families notice calmer, more ' +
        'focused behaviour at home within weeks.',
    },
    {
      category: 'About the training',
      question: 'Can parents train with their kids?',
      answer:
        'Yes, and it is one of the best things about LMAA. The family class puts parents and ' +
        'kids on the same mat, and entire families have earned their black belts together here.',
    },
    {
      category: 'Belts & testing',
      question: 'How often are belt tests?',
      answer:
        'Four times a year: March, June, September and December. If your schedule conflicts with ' +
        'a test day, make-up tests are available — just talk with Master Lee beforehand.',
    },
    {
      category: 'Belts & testing',
      question: 'We trained at another school. Do our belts transfer?',
      answer:
        'Yes. Master Lee will observe your skill and knowledge, discuss where you are, and match ' +
        'you to the equivalent level here. Your training is acknowledged, not reset.',
    },
    {
      category: 'Belts & testing',
      question: 'Are the belts legitimate?',
      answer:
        'LMAA is affiliated with Kukkiwon (World Taekwondo Headquarters in Seoul) and World ' +
        'Taekwondo. Black belts earned here are registered and recognised worldwide, not just ' +
        'inside our school.',
    },
    {
      category: 'Membership',
      question: 'Do you offer family discounts?',
      answer:
        'Yes — there is a Family Program discount when more than one family member enrols ' +
        'together. Ask at the front desk or call for details.',
    },
    {
      category: 'Membership',
      question: 'What does it cost?',
      answer:
        'A simple monthly membership, with the Family Program discount when more than one family ' +
        'member trains. Call (503) 682-2318 for current rates. Before you enrol we walk you ' +
        'through every cost up front, including uniforms and belt testing, so there are no ' +
        'surprises later.',
    },
  ]

  return items.map((item, index) => ({
    id: `faq-${index + 1}`,
    question: item.question,
    answer: item.answer,
    category: item.category,
    sortOrder: index + 1,
    published: true,
    ...stamps(),
  }))
}

/* ---------------------------------------------------------------- resources */

/**
 * Only links the academy actually publishes.
 *
 * The `curriculum` and `binder` collections are empty: LMAA has not supplied
 * technique videos or the student binder, and manufacturing martial arts
 * instruction would be worse than an empty shelf.
 */
export function seedResources(): LearningResource[] {
  const items: Omit<LearningResource, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'res-website',
      title: 'Academy website',
      description: 'Programs, instructors, reviews and the free trial booking form.',
      type: 'link',
      collection: 'resources',
      externalUrl: 'https://www.leesmartialartsacademy.com',
      sortOrder: 1,
      published: true,
    },
    {
      id: 'res-instagram',
      title: 'LMAA on Instagram',
      description: 'Photos from the mat, tournaments and events. Replies within 24 hours.',
      type: 'link',
      collection: 'resources',
      externalUrl: 'https://www.instagram.com/lmaa__wilsonville',
      sortOrder: 2,
      published: true,
    },
  ]
  return items.map((item) => ({ ...item, ...stamps() }))
}

/* -------------------------------------------------------------------- pages */

export function seedPages(): Page[] {
  const pages: Omit<Page, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'page-about',
      slug: 'about',
      title: 'About the academy',
      published: true,
      body:
        'Master C.Y. Lee founded Lee’s Martial Arts Academy in Wilsonville in 2005. For more than ' +
        'twenty years he and his instructors have taught traditional Taekwondo and HapKiDo to ' +
        'local families, many of whom have gone from their first white belt to black belt under ' +
        'the same roof.\n\n' +
        '"I welcome you. Here you will discover that in addition to providing the best martial ' +
        'arts training, we also build character, respect, confidence, focus and integrity. ' +
        'Martial arts is a journey, and it will have a positive impact on your life and your ' +
        'child’s life." — Master C.Y. Lee\n\n' +
        '- 6th Dan in Taekwondo and 6th Dan in HapKiDo\n' +
        '- Affiliated with Kukkiwon and World Taekwondo, so black belts earned here are recognised worldwide\n' +
        '- Traditional curriculum: Taekwondo, HapKiDo and practical self-defence\n' +
        '- Every age welcome, from Little Tigers at 4 to adults at 50+\n\n' +
        'The instructors\n\n' +
        '- Master C.Y. Lee — Founder, 6th Dan Taekwondo & HapKiDo\n' +
        '- Instructor Kevin — Head Instructor\n' +
        '- Master Cameron — Assistant Instructor\n' +
        '- Master Jacob — Assistant Instructor\n\n' +
        'Families train with us from Wilsonville, Tualatin, Canby, Aurora, West Linn, Tigard, ' +
        'Lake Oswego and Portland.',
    },
    {
      id: 'page-tenets',
      slug: 'tenets',
      title: 'Tenets & the LMAA Pledge',
      published: true,
      body:
        'The kicks are how we teach. The tenets are what a student keeps for life.\n\n' +
        '예의 · Ye-ui — Courtesy\n' +
        'Respect for parents, teachers and each other, practised every single class.\n\n' +
        '염치 · Yom-chi — Integrity\n' +
        'Doing the right thing on the mat, at school and at home. Even when no one is watching.\n\n' +
        '인내 · In-nae — Perseverance\n' +
        'Fall seven times, stand up eight. Every belt is proof that effort beats talent.\n\n' +
        '극기 · Geuk-gi — Self-Control\n' +
        'Focus and discipline parents notice within weeks: in homework, chores and attitude.\n\n' +
        '백절불굴 · Baekjul-bulgul — Indomitable Spirit\n' +
        'The confidence to try, fail and try again. The quiet kind of brave that lasts long ' +
        'after class ends.\n\n' +
        'The LMAA Pledge — recited every class\n\n' +
        '"We will practise Taekwondo with…"\n\n' +
        '- Respect: We will always respect our parents, sir.\n' +
        '- Integrity: We will always set a good example, sir.\n' +
        '- Courtesy: We will always build a peaceful community, sir.\n' +
        '- Perseverance: We will never give up, sir.\n' +
        '- LMAA Student: We will always do our best, sir.\n\n' +
        '"Peace on Earth begins with peace within yourself."',
    },
    {
      id: 'page-belts',
      slug: 'belts',
      title: 'The belt journey',
      published: true,
      body:
        'Belts are not just colours — they are the road map. Thirteen steps from white to black, ' +
        'with senior stripes marking the halfway point in each colour. Tests run four times a ' +
        'year (March, June, September and December), so the next goal is never far away.\n\n' +
        '- White — day one. The courage to start.\n' +
        '- Yellow — first skills, first confidence.\n' +
        '- Orange, then Senior Orange — momentum. Practice becomes habit.\n' +
        '- Green, then Senior Green — power with control.\n' +
        '- Blue, then Senior Blue — falls down. Gets back up.\n' +
        '- Brown, then Senior Brown — quiet leadership begins.\n' +
        '- Red, then Senior Red — discipline becomes second nature.\n' +
        '- Black — not the end. A new beginning.\n\n' +
        'Every black belt started at white.',
    },
    {
      id: 'page-beyond-class',
      slug: 'beyond-class',
      title: 'Beyond class',
      published: true,
      body:
        'The dojang does not sleep between classes. Dates for each of these are announced by the ' +
        'academy — watch the Updates tab, or ask at the front desk.\n\n' +
        '- Summer camps: week-long themed camps, including Nerf battles, ninja obstacle courses, ' +
        'sparring camp and movie days.\n' +
        '- Birthday parties: bouncy house, ninja obstacle course and board breaking for every ' +
        'guest — and the birthday kid cuts the cake with a samurai sword.\n' +
        '- Tournaments & demo team: area schools compete twice a year in forms, breaking and ' +
        'sparring, and the demo team performs at school events and tournaments.\n' +
        '- Mom & Me, Dad & Me: parents join their child on the mat the Saturdays before Mother’s ' +
        'Day and Father’s Day.\n' +
        '- Parents Night Out, the Halloween party and the holiday potluck: pizza-and-games nights ' +
        'for the kids, a legendary costume party, and a year-end belt ceremony feast.',
    },
    {
      id: 'page-support',
      slug: 'support',
      title: 'Support',
      published: true,
      body:
        'Something wrong in the app?\n\n' +
        'Most problems clear up if you close the app completely and open it again. If the ' +
        'information looks out of date, check your internet connection — the app keeps the last ' +
        'version it downloaded so you can still read it offline.\n\n' +
        'If that does not fix it, tell us what you were doing and what you saw, and which phone ' +
        'you are using. The fastest way to reach the academy is by phone during opening hours:\n\n' +
        '- Phone: (503) 682-2318 (Monday – Friday, 1:00 – 8:40 PM)\n' +
        '- Email: lmaa.wilsonville@gmail.com\n' +
        '- Instagram DM: @lmaa__wilsonville — replies within 24 hours\n\n' +
        'Questions about classes, belts, testing or membership are best asked at the front desk ' +
        'or by phone, not through the app.',
    },
    {
      id: 'page-privacy',
      slug: 'privacy',
      title: 'Privacy Policy',
      published: true,
      // The one remaining placeholder: a privacy policy is a legal statement and
      // must be approved by the academy, not drafted by the app.
      isSample: true,
      body:
        '[Draft — must be reviewed and approved by LMAA before launch]\n\n' +
        'This app is built privacy-first. In this version:\n\n' +
        '- No account is required to use the app.\n' +
        '- No information about students or children is collected.\n' +
        '- No advertising or behavioural tracking is used.\n' +
        '- Your read/unread marks and app preferences are stored only on your own device.\n' +
        '- Administrator sign-in is limited to academy staff.\n\n' +
        'If push notifications or family accounts are added later, this policy must be updated ' +
        'before those features are switched on. Questions can be sent to the academy using the ' +
        'contact details on the Contact screen.',
    },
  ]

  return pages.map((page) => ({ ...page, ...stamps() }))
}

/* ------------------------------------------------------------------ gallery */

/**
 * Empty on purpose. The academy's photographs are of its own students, and
 * nothing goes in here until LMAA supplies the images with permission to use
 * them — see CONTENT_NEEDED.md.
 */
export function seedGallery(): GalleryItem[] {
  return []
}

/* ------------------------------------------------------------------- bundle */

export function createSeedBundle(now: Date = new Date()): ContentBundle {
  return {
    settings: seedSettings(),
    announcements: seedAnnouncements(now),
    events: seedEvents(),
    schedule: seedSchedule(),
    resources: seedResources(),
    programs: seedPrograms(),
    faqs: seedFaqs(),
    pages: seedPages(),
    gallery: seedGallery(),
  }
}
