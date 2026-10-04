import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENT_TEMPLATES } from '@/features/admin/eventTemplates'
import { ALL_APP_IMAGES } from './images'

const PUBLIC = resolve(__dirname, '..', '..', 'public')
const referenced = [
  ...ALL_APP_IMAGES,
  ...EVENT_TEMPLATES.map((template) => template.imageUrl).filter((url): url is string => !!url),
]

describe('bundled images', () => {
  it('references at least one image', () => {
    expect(referenced.length).toBeGreaterThan(0)
  })

  it.each(referenced)('%s exists in public/', (path) => {
    expect(existsSync(resolve(PUBLIC, path))).toBe(true)
  })

  it.each(referenced)('%s is app-relative and small enough for a phone', (path) => {
    // Absolute URLs would break on a custom domain; big files burn data.
    expect(path).toMatch(/^images\/[a-z0-9/_-]+\.(?:jpe?g|png|webp)$/)
    expect(statSync(resolve(PUBLIC, path)).size).toBeLessThanOrEqual(220 * 1024)
  })
})
