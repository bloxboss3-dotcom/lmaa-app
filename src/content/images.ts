import type { AnnouncementCategory } from '@/domain/types'

/**
 * Where the app's own illustrative images live, and which screens use them.
 *
 * These are environmental photographs of the dojang — belts, kit, the mat, a
 * potluck table — and deliberately contain no people. They are illustration,
 * not record: the real photographs of the academy belong in the gallery, with
 * permission, and nothing here stands in for a student or an instructor.
 *
 * Paths are app-relative (`images/…`), not absolute URLs, so they keep working
 * if the app moves from the GitHub Pages sub-path to a custom domain. The hash
 * router never changes the document path, so a relative `src` resolves against
 * the app's base on every screen. A test checks that every file listed here
 * actually exists in `public/`.
 */

/** Default header for an update that has no image of its own. */
export const UPDATE_CATEGORY_IMAGES: Partial<Record<AnnouncementCategory, string>> = {
  schedule: 'images/update-schedule.jpg',
  testing: 'images/update-testing.jpg',
  events: 'images/event-tournament.jpg',
  camps: 'images/event-summer-camp.jpg',
  community: 'images/event-holiday-potluck.jpg',
  // `important` is left without a picture on purpose: an urgent notice should
  // not arrive wearing a cheerful photograph.
}

/** Hero image for an information page, by slug. */
export const PAGE_HERO_IMAGES: Record<string, string> = {
  belts: 'images/belts.jpg',
  tenets: 'images/tenets.jpg',
}

/** Card image for a program, by slug. Programs without one render as text. */
export const PROGRAM_IMAGES: Record<string, string> = {
  'teen-adult': 'images/program-teen-adult.jpg',
}

/** Every image path the app references, for the existence test. */
export const ALL_APP_IMAGES: string[] = [
  ...new Set([
    ...Object.values(UPDATE_CATEGORY_IMAGES),
    ...Object.values(PAGE_HERO_IMAGES),
    ...Object.values(PROGRAM_IMAGES),
  ]),
] as string[]
