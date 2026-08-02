import { describe, expect, it } from 'vitest'
import { looksLikeSecretKey } from './env'

/**
 * The single most damaging mistake a static app can make is shipping a
 * privileged database key to the browser, so the guard gets its own tests.
 */
describe('looksLikeSecretKey', () => {
  function jwt(payload: Record<string, unknown>): string {
    const encode = (value: object) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
  }

  it('accepts a browser-safe publishable key', () => {
    expect(looksLikeSecretKey('sb_publishable_abc123')).toBe(false)
  })

  it('accepts a legacy anon JWT', () => {
    expect(looksLikeSecretKey(jwt({ role: 'anon', iss: 'supabase' }))).toBe(false)
  })

  it('rejects the new-style secret key', () => {
    expect(looksLikeSecretKey('sb_secret_abc123')).toBe(true)
  })

  it('rejects a service-role JWT', () => {
    expect(looksLikeSecretKey(jwt({ role: 'service_role', iss: 'supabase' }))).toBe(true)
  })

  it('rejects any non-anon role', () => {
    expect(looksLikeSecretKey(jwt({ role: 'postgres' }))).toBe(true)
  })

  it('treats blank and opaque values as not-a-secret', () => {
    expect(looksLikeSecretKey('')).toBe(false)
    expect(looksLikeSecretKey('   ')).toBe(false)
    expect(looksLikeSecretKey('some.opaque.value')).toBe(false)
  })
})
