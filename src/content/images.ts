import type { AnnouncementCategory } from '@/domain/types'

/**
 * Where the app's own illustrative images live, and which screens use them.
 *
 * Two kinds live here. `photo-*.jpg` are the academy's own photographs, sent
 * by the academy for use in the app; people in them are shown with the
 * academy's permission. The rest are generated illustration: any students in
 * them are seen from behind with no face, and nothing in them is presented as
 * a particular person.
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
  about: 'images/photo-black-belt-test-group.jpg',
  belts: 'images/belts.jpg',
  'new-families': 'images/photo-lmaa-back.jpg',
  testing: 'images/photo-instructor-form.jpg',
  tenets: 'images/tenets.jpg',
}

/** Card image for a program, by slug. Programs without one render as text. */
export const PROGRAM_IMAGES: Record<string, string> = {
  // The Little Tigers belts until the academy's own class photos arrive.
  'little-tigers': 'images/belts-little-tigers.jpg',
  // The academy's own photographs from its November 2026 black belt test.
  'kids-taekwondo': 'images/photo-partner-drill.jpg',
  'teen-adult': 'images/photo-class-punch.jpg',
  'family-class': 'images/program-family.jpg',
}

/**
 * The Home photo strip until the academy adds its own gallery photos. Once a
 * published gallery photo exists, those take over and these are never shown.
 */
export const HOME_PHOTOS: string[] = [
  'images/photo-black-belt-test-group.jpg',
  'images/photo-class-punch.jpg',
  'images/photo-lmaa-back.jpg',
  'images/photo-partner-drill.jpg',
  'images/photo-demo-team.jpg',
  'images/photo-instructor-form.jpg',
  'images/belts-little-tigers.jpg',
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
