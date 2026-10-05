import type { AnnouncementCategory } from '@/domain/types'

/**
 * Where the app's own illustrative images live, and which screens use them.
 *
 * They are illustration, not record. Some show students, always from behind
 * and never with a face: the academy decided that was acceptable provided the
 * uniform and logo are right and the picture looks natural. The real
 * photographs of the academy still belong in the gallery, with permission, and
 * nothing here is presented as a particular person.
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
  // The Little Tigers stripe belts themselves (white with one coloured stripe),
  // until a people shot exists that gets those belts right.
  'little-tigers': 'images/program-little-tigers.jpg',
  'kids-taekwondo': 'images/program-kids.jpg',
  'teen-adult': 'images/program-teen-adult.jpg',
  'family-class': 'images/program-family.jpg',
}

/**
 * The Home photo strip until the academy adds its own gallery photos. Once a
 * published gallery photo exists, those take over and these are never shown.
 */
export const HOME_PHOTOS: string[] = [
  'images/program-kids.jpg',
  'images/belts.jpg',
  'images/event-parents-day.jpg',
  'images/event-belt-testing.jpg',
  'images/update-testing.jpg',
]

/** Every image path the app references, for the existence test. */
export const ALL_APP_IMAGES: string[] = [
  ...new Set([
    ...Object.values(UPDATE_CATEGORY_IMAGES),
    ...Object.values(PAGE_HERO_IMAGES),
    ...Object.values(PROGRAM_IMAGES),
    ...HOME_PHOTOS,
  ]),
] as string[]
