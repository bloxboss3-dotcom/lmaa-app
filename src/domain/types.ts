/**
 * Domain types for the LMAA Family App.
 *
 * These are storage-agnostic on purpose: the demo repository, the Supabase
 * repository and (later) the Dojang OS API all speak these shapes, so the UI
 * never has to know where content came from.
 */

/** ISO-8601 instant, e.g. `2026-08-01T22:30:00.000Z`. */
export type IsoDateTime = string
/** Calendar date without a time, e.g. `2026-08-01`. */
export type IsoDate = string
/** 24-hour local time of day, e.g. `16:25`. */
export type TimeOfDay = string
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Timestamped {
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** Marks built-in demo content so the UI can label it honestly. */
export interface Sampleable {
  /** True for seeded demo content that is not real LMAA information. */
  isSample?: boolean
}

/* ------------------------------------------------------------ announcements */

export const ANNOUNCEMENT_CATEGORIES = [
  'important',
  'schedule',
  'testing',
  'events',
  'camps',
  'community',
] as const
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number]

export const ANNOUNCEMENT_PRIORITIES = ['normal', 'high', 'urgent'] as const
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number]

export interface Announcement extends Timestamped, Sampleable {
  id: string
  title: string
  body: string
  imageUrl?: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  pinned: boolean
  published: boolean
  /** When the post becomes visible to families. May be in the future. */
  publishedAt: IsoDateTime
  /** Optional moment after which the post disappears from the feed. */
  expiresAt?: IsoDateTime
  actionLabel?: string
  actionUrl?: string
}

/* ------------------------------------------------------------------ events */

export interface AcademyEvent extends Timestamped, Sampleable {
  id: string
  title: string
  startAt: IsoDateTime
  endAt?: IsoDateTime
  allDay: boolean
  location?: string
  address?: string
  description: string
  imageUrl?: string
  registrationUrl?: string
  waiverUrl?: string
  /** Who the event is for, e.g. "All students and families". */
  audience?: string
  featured: boolean
  published: boolean
  publishedAt: IsoDateTime
}

/* ---------------------------------------------------------------- schedule */

export const SCHEDULE_STATUSES = ['scheduled', 'cancelled', 'changed'] as const
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

export interface ScheduleEntry extends Timestamped {
  id: string
  /** Display name of the class, e.g. "Little Tigers". */
  className: string
  /** Optional link to a Program record (used for filtering). */
  programSlug?: string
  dayOfWeek: Weekday
  startTime: TimeOfDay
  endTime: TimeOfDay
  ageRange?: string
  level?: string
  description?: string
  eligibility?: string
  /** Temporary notice: cancelled or time changed. */
  status: ScheduleStatus
  /** Plain-language note shown with the notice, e.g. "Closed for Thanksgiving". */
  statusNote?: string
  /** Single date the notice applies to. Empty = applies until removed. */
  statusDate?: IsoDate
  /** Replacement times when `status === 'changed'`. */
  newStartTime?: TimeOfDay
  newEndTime?: TimeOfDay
  published: boolean
  sortOrder: number
}

/* ---------------------------------------------------------------- learning */

export const RESOURCE_TYPES = ['video', 'document', 'link'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const RESOURCE_COLLECTIONS = ['curriculum', 'binder', 'resources'] as const
/** Which Learn section a resource belongs to. */
export type ResourceCollection = (typeof RESOURCE_COLLECTIONS)[number]

export interface LearningResource extends Timestamped, Sampleable {
  id: string
  title: string
  description?: string
  type: ResourceType
  collection: ResourceCollection
  /** Program or level the resource belongs to, e.g. "Children White Belt". */
  program?: string
  level?: string
  thumbnailUrl?: string
  videoUrl?: string
  documentUrl?: string
  externalUrl?: string
  sortOrder: number
  published: boolean
}

export interface Program extends Timestamped, Sampleable {
  id: string
  name: string
  slug: string
  ageRange?: string
  summary: string
  description?: string
  sortOrder: number
  published: boolean
}

export interface Faq extends Timestamped, Sampleable {
  id: string
  question: string
  answer: string
  category?: string
  sortOrder: number
  published: boolean
}

/* -------------------------------------------------------- pages & gallery */

export interface Page extends Timestamped, Sampleable {
  id: string
  /** URL-safe key, e.g. `about`, `privacy`, `support`. */
  slug: string
  title: string
  /** Plain text. Blank lines separate paragraphs; `- ` starts a bullet. */
  body: string
  published: boolean
}

export interface GalleryItem extends Timestamped, Sampleable {
  id: string
  title?: string
  caption?: string
  imageUrl: string
  /** Photo credit / permission note kept with the image. */
  credit?: string
  sortOrder: number
  published: boolean
}

/* ---------------------------------------------------------------- settings */

export interface SocialLinks {
  facebook?: string
  instagram?: string
  youtube?: string
  tiktok?: string
}

export interface AcademySettings {
  academyName: string
  tagline?: string
  description?: string
  /** Digits and formatting as families should see it. Empty = not provided yet. */
  phone?: string
  email?: string
  /** One line per array entry. */
  addressLines: string[]
  mapUrl?: string
  websiteUrl?: string
  supportEmail?: string
  officeHours?: string
  social: SocialLinks
  updatedAt: IsoDateTime
}

/* ---------------------------------------------------------------- messages */

export const MESSAGE_TOPICS = ['general', 'trial', 'schedule', 'events', 'other'] as const
export type MessageTopic = (typeof MESSAGE_TOPICS)[number]

export const MESSAGE_STATUSES = ['new', 'handled'] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

/** What a family types in. Nothing else is asked for. */
export interface ContactMessageDraft {
  name: string
  /** An email address or a phone number — one way to reply. */
  contact: string
  topic: MessageTopic
  body: string
}

/** A message as staff see it in the inbox. Readable by staff only. */
export interface ContactMessage extends ContactMessageDraft, Sampleable {
  id: string
  status: MessageStatus
  createdAt: IsoDateTime
  handledAt?: IsoDateTime
}

/* ------------------------------------------------------------ people/roles */

export const STAFF_ROLES = ['admin', 'editor'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export interface StaffProfile {
  id: string
  email: string
  displayName?: string
  role: StaffRole
}

/* ---------------------------------------------------------- notifications */

export interface NotificationSubscription {
  id: string
  /** `web` today; `ios` / `android` once the Capacitor build ships. */
  platform: 'web' | 'ios' | 'android'
  /** Provider-issued identifier (push token or subscription id). */
  providerId: string
  topics: string[]
  createdAt: IsoDateTime
}

/* -------------------------------------------------------------- utilities */

/** Everything the admin UI can edit for a record, minus server-managed fields. */
export type DraftOf<T extends Timestamped> = Omit<T, 'createdAt' | 'updatedAt' | 'id'> & {
  id?: string
}
