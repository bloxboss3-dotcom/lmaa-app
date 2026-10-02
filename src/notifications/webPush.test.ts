import { describe, expect, it } from 'vitest'
import { ALL_TOPIC_IDS, bufferToBase64Url, vapidKeyToBytes } from './webPush'
import { UnconfiguredNotificationProvider } from './index'

/** A structurally valid VAPID public key: 0x04 then two 32-byte coordinates. */
function makeVapidKey(): string {
  const bytes = new Uint8Array(65)
  bytes[0] = 0x04
  for (let index = 1; index < 65; index += 1) bytes[index] = index
  return bufferToBase64Url(bytes.buffer)
}

describe('vapidKeyToBytes', () => {
  it('round-trips a valid key', () => {
    const key = makeVapidKey()
    const bytes = vapidKeyToBytes(key)
    expect(bytes).toHaveLength(65)
    expect(bytes[0]).toBe(0x04)
    expect(bufferToBase64Url(bytes.buffer)).toBe(key)
  })

  it('accepts a key with the base64url alphabet and no padding', () => {
    const key = makeVapidKey()
    expect(key).not.toContain('=')
    expect(key).not.toContain('+')
    expect(key).not.toContain('/')
    expect(() => vapidKeyToBytes(key)).not.toThrow()
  })

  it('tolerates surrounding whitespace, which is what pasting a key produces', () => {
    expect(() => vapidKeyToBytes(`  ${makeVapidKey()}\n`)).not.toThrow()
  })

  it('rejects standard base64 rather than silently mis-decoding it', () => {
    // `+` and `/` are valid base64 but not base64url; a key pasted from the
    // wrong tool would otherwise decode to the wrong bytes and Chrome would
    // fail later with a generic error.
    expect(() => vapidKeyToBytes('abc+def/ghi=')).toThrow(/base64url/i)
  })

  it('rejects a key of the wrong length', () => {
    expect(() => vapidKeyToBytes(bufferToBase64Url(new Uint8Array(32).buffer))).toThrow(/65 bytes/i)
  })

  it('rejects a 65-byte key that is not an uncompressed point', () => {
    const bytes = new Uint8Array(65)
    bytes[0] = 0x02 // compressed point marker
    expect(() => vapidKeyToBytes(bufferToBase64Url(bytes.buffer))).toThrow(/0x04/)
  })
})

describe('bufferToBase64Url', () => {
  it('returns an empty string for a missing key rather than throwing', () => {
    // `subscription.getKey()` returns null when the browser has no key yet.
    expect(bufferToBase64Url(null)).toBe('')
  })

  it('produces URL-safe output with no padding', () => {
    const bytes = new Uint8Array([251, 255, 190, 254, 252])
    const encoded = bufferToBase64Url(bytes.buffer)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('topics', () => {
  it('offers class changes, events and academy news', () => {
    expect(ALL_TOPIC_IDS).toEqual(['schedule', 'events', 'updates'])
  })
})

describe('UnconfiguredNotificationProvider', () => {
  it('never claims a notification was sent', async () => {
    const provider = new UnconfiguredNotificationProvider()
    const result = await provider.send()
    expect(result.sent).toBe(false)
    expect(result.reason).toMatch(/not connected/i)
  })

  it('reports that it cannot send, so the admin Send button stays disabled', () => {
    const provider = new UnconfiguredNotificationProvider()
    expect(provider.canSend).toBe(false)
    expect(provider.isConfigured).toBe(false)
  })

  it('returns no subscription rather than inventing one', async () => {
    const provider = new UnconfiguredNotificationProvider()
    expect(await provider.subscribe()).toBeNull()
    expect(await provider.getSubscription()).toBeNull()
  })
})
