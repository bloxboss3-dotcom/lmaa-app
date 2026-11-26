import { describe, expect, it } from 'vitest'
import { isPublicContentRequest } from './cacheRules'

const KEY = 'sb_publishable_example'
const match = (path: string, headers: Record<string, string>) =>
  isPublicContentRequest({
    url: new URL(`https://example.supabase.co${path}`),
    request: new Request(`https://example.supabase.co${path}`, { headers }),
  })

describe('what the service worker may keep for offline use', () => {
  it("keeps a visitor's read of public content", () => {
    expect(
      match('/rest/v1/schedule_entries?select=*', { apikey: KEY, authorization: `Bearer ${KEY}` }),
    ).toBe(true)
  })

  it('never keeps what a signed-in person read: messages, drafts or a student', () => {
    const signedIn = { apikey: KEY, authorization: 'Bearer eyJ.a-signed-in-users-token.x' }
    expect(match('/rest/v1/contact_messages?select=*', signedIn)).toBe(false)
    expect(match('/rest/v1/students?select=*', signedIn)).toBe(false)
    expect(match('/rest/v1/announcements?select=*', signedIn)).toBe(false)
  })

  it('never keeps a request it cannot tell is a visitor', () => {
    expect(match('/rest/v1/pages?select=*', {})).toBe(false)
    expect(match('/rest/v1/pages?select=*', { authorization: `Bearer ${KEY}` })).toBe(false)
  })

  it('leaves sign-in and everything else alone', () => {
    expect(match('/auth/v1/token', { apikey: KEY, authorization: `Bearer ${KEY}` })).toBe(false)
  })

  it('stands alone, because it is copied into the service worker as text', () => {
    const source = isPublicContentRequest.toString()
    // Anything it referenced from outside would be undefined there.
    const rebuilt = new Function(`return (${source})`)() as typeof isPublicContentRequest
    expect(
      rebuilt({
        url: new URL('https://example.supabase.co/rest/v1/faqs'),
        request: new Request('https://example.supabase.co/rest/v1/faqs', {
          headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
        }),
      }),
    ).toBe(true)
  })
})
