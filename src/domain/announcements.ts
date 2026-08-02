import type { Announcement, AnnouncementCategory, AnnouncementPriority } from './types'

const PRIORITY_WEIGHT: Record<AnnouncementPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
}

/**
 * Is this announcement live for families right now?
 *
 * An announcement is visible when it is published, its publish time has
 * arrived, and it has not expired. Scheduled-for-later posts stay hidden until
 * their moment, which is what makes "schedule a post" safe for admins.
 */
export function isAnnouncementVisible(announcement: Announcement, now: Date = new Date()): boolean {
  if (!announcement.published) return false
  const publishAt = Date.parse(announcement.publishedAt)
  if (Number.isNaN(publishAt) || publishAt > now.getTime()) return false
  if (announcement.expiresAt) {
    const expires = Date.parse(announcement.expiresAt)
    if (!Number.isNaN(expires) && expires <= now.getTime()) return false
  }
  return true
}

/** True when the post is published but its publish time is still in the future. */
export function isScheduled(announcement: Announcement, now: Date = new Date()): boolean {
  if (!announcement.published) return false
  const publishAt = Date.parse(announcement.publishedAt)
  return !Number.isNaN(publishAt) && publishAt > now.getTime()
}

/** True when an expiry date has already passed. */
export function isExpired(announcement: Announcement, now: Date = new Date()): boolean {
  if (!announcement.expiresAt) return false
  const expires = Date.parse(announcement.expiresAt)
  return !Number.isNaN(expires) && expires <= now.getTime()
}

/** Pinned first, then urgency, then newest. Stable and predictable for parents. */
export function sortAnnouncements(announcements: Announcement[]): Announcement[] {
  return [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const priority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
    if (priority !== 0) return priority
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  })
}

/** The family-facing feed: visible posts only, in reading order. */
export function visibleAnnouncements(
  announcements: Announcement[],
  now: Date = new Date(),
): Announcement[] {
  return sortAnnouncements(announcements.filter((item) => isAnnouncementVisible(item, now)))
}

export function filterByCategory(
  announcements: Announcement[],
  category: AnnouncementCategory | 'all',
): Announcement[] {
  if (category === 'all') return announcements
  return announcements.filter((item) => item.category === category)
}

/**
 * The single announcement worth putting on the home screen: the most important
 * live post, preferring pinned/urgent, then the newest.
 */
export function headlineAnnouncement(
  announcements: Announcement[],
  now: Date = new Date(),
): Announcement | undefined {
  return visibleAnnouncements(announcements, now)[0]
}

export function countUnread(announcements: Announcement[], readIds: readonly string[]): number {
  const read = new Set(readIds)
  return announcements.reduce((total, item) => (read.has(item.id) ? total : total + 1), 0)
}

export const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  important: 'Important',
  schedule: 'Schedule',
  testing: 'Testing',
  events: 'Events',
  camps: 'Camps',
  community: 'Community',
}

export const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}
