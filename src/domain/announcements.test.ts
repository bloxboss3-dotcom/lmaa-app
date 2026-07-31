import { describe, expect, it } from 'vitest'
import {
  countUnread,
  filterByCategory,
  headlineAnnouncement,
  isAnnouncementVisible,
  isExpired,
  isScheduled,
  sortAnnouncements,
  visibleAnnouncements,
} from './announcements'
import type { Announcement } from './types'

const NOW = new Date('2026-08-01T12:00:00.000Z')

function announcement(overrides: Partial<Announcement> & { id: string }): Announcement {
  return {
    title: 'Title',
    body: 'Body',
    category: 'important',
    priority: 'normal',
    pinned: false,
    published: true,
    publishedAt: '2026-07-31T12:00:00.000Z',
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    ...overrides,
  }
}

describe('isAnnouncementVisible', () => {
  it('shows a published post whose time has arrived', () => {
    expect(isAnnouncementVisible(announcement({ id: 'a' }), NOW)).toBe(true)
  })

  it('hides an unpublished draft', () => {
    expect(isAnnouncementVisible(announcement({ id: 'a', published: false }), NOW)).toBe(false)
  })

  it('hides a post scheduled for the future', () => {
    const future = announcement({ id: 'a', publishedAt: '2026-08-02T09:00:00.000Z' })
    expect(isAnnouncementVisible(future, NOW)).toBe(false)
  })

  it('shows a post exactly at its publish time', () => {
    const exact = announcement({ id: 'a', publishedAt: NOW.toISOString() })
    expect(isAnnouncementVisible(exact, NOW)).toBe(true)
  })

  it('hides a post that has expired', () => {
    const expired = announcement({ id: 'a', expiresAt: '2026-08-01T11:59:00.000Z' })
    expect(isAnnouncementVisible(expired, NOW)).toBe(false)
  })

  it('keeps a post whose expiry is still ahead', () => {
    const live = announcement({ id: 'a', expiresAt: '2026-08-05T00:00:00.000Z' })
    expect(isAnnouncementVisible(live, NOW)).toBe(true)
  })

  it('hides posts with an unparseable publish time rather than crashing', () => {
    expect(isAnnouncementVisible(announcement({ id: 'a', publishedAt: 'not a date' }), NOW)).toBe(
      false,
    )
  })

  it('ignores an unparseable expiry instead of hiding a live post', () => {
    expect(isAnnouncementVisible(announcement({ id: 'a', expiresAt: 'soon' }), NOW)).toBe(true)
  })
})

describe('isScheduled / isExpired', () => {
  it('identifies posts waiting for their moment', () => {
    expect(isScheduled(announcement({ id: 'a', publishedAt: '2026-09-01T00:00:00Z' }), NOW)).toBe(
      true,
    )
    expect(isScheduled(announcement({ id: 'a' }), NOW)).toBe(false)
    expect(
      isScheduled(announcement({ id: 'a', published: false, publishedAt: '2026-09-01T00:00:00Z' }), NOW),
    ).toBe(false)
  })

  it('identifies posts past their expiry', () => {
    expect(isExpired(announcement({ id: 'a', expiresAt: '2026-07-01T00:00:00Z' }), NOW)).toBe(true)
    expect(isExpired(announcement({ id: 'a' }), NOW)).toBe(false)
  })
})

describe('sortAnnouncements', () => {
  it('puts pinned posts first, then urgency, then newest', () => {
    const items = [
      announcement({ id: 'old', publishedAt: '2026-07-01T00:00:00Z' }),
      announcement({ id: 'new', publishedAt: '2026-07-30T00:00:00Z' }),
      announcement({ id: 'urgent', priority: 'urgent', publishedAt: '2026-07-02T00:00:00Z' }),
      announcement({ id: 'pinned', pinned: true, publishedAt: '2026-06-01T00:00:00Z' }),
    ]
    expect(sortAnnouncements(items).map((item) => item.id)).toEqual([
      'pinned',
      'urgent',
      'new',
      'old',
    ])
  })
})

describe('visibleAnnouncements', () => {
  it('filters and sorts in one pass', () => {
    const items = [
      announcement({ id: 'draft', published: false }),
      announcement({ id: 'future', publishedAt: '2026-12-01T00:00:00Z' }),
      announcement({ id: 'expired', expiresAt: '2026-07-01T00:00:00Z' }),
      announcement({ id: 'live', publishedAt: '2026-07-20T00:00:00Z' }),
      announcement({ id: 'pinned', pinned: true, publishedAt: '2026-07-10T00:00:00Z' }),
    ]
    expect(visibleAnnouncements(items, NOW).map((item) => item.id)).toEqual(['pinned', 'live'])
  })
})

describe('filterByCategory', () => {
  const items = [
    announcement({ id: 'a', category: 'testing' }),
    announcement({ id: 'b', category: 'camps' }),
  ]

  it('returns everything for "all"', () => {
    expect(filterByCategory(items, 'all')).toHaveLength(2)
  })

  it('narrows to one category', () => {
    expect(filterByCategory(items, 'camps').map((item) => item.id)).toEqual(['b'])
  })
})

describe('headlineAnnouncement', () => {
  it('picks the most important live post for the home screen', () => {
    const items = [
      announcement({ id: 'normal' }),
      announcement({ id: 'pinned', pinned: true }),
      announcement({ id: 'future', pinned: true, publishedAt: '2026-12-01T00:00:00Z' }),
    ]
    expect(headlineAnnouncement(items, NOW)?.id).toBe('pinned')
  })

  it('returns undefined when nothing is live', () => {
    expect(headlineAnnouncement([announcement({ id: 'a', published: false })], NOW)).toBeUndefined()
  })
})

describe('countUnread', () => {
  it('counts posts the reader has not opened', () => {
    const items = [announcement({ id: 'a' }), announcement({ id: 'b' }), announcement({ id: 'c' })]
    expect(countUnread(items, ['b'])).toBe(2)
    expect(countUnread(items, ['a', 'b', 'c'])).toBe(0)
    expect(countUnread([], [])).toBe(0)
  })
})
