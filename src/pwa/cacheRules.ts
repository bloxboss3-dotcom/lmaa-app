/**
 * Which network responses the service worker may keep for offline use.
 *
 * Imported by vite.config.ts and written into the generated service worker as
 * source text, so each function here must stand alone: no imports, no
 * variables from outside its own body.
 */

interface RouteMatch {
  url: URL
  request: Request
}

/**
 * True for a read of the academy's PUBLIC content only.
 *
 * The app sends its publishable key in two headers. For a visitor they carry
 * the same value; once someone signs in, `authorization` carries that person's
 * own token instead. A signed-in read can return drafts, messages from
 * families or a student's record, and none of that may be left in the phone's
 * cache, so only the visitor's requests are kept.
 */
export function isPublicContentRequest({ url, request }: RouteMatch): boolean {
  if (!url.pathname.includes('/rest/v1/')) return false
  const key = request.headers.get('apikey')
  return Boolean(key) && request.headers.get('authorization') === `Bearer ${key}`
}
