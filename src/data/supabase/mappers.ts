import type {
  AcademyEvent,
  AcademySettings,
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  Faq,
  GalleryItem,
  LearningResource,
  Page,
  Program,
  ResourceCollection,
  ResourceType,
  ScheduleEntry,
  ScheduleStatus,
  SocialLinks,
  Weekday,
} from '@/domain/types'
import type { Draft } from '../repository'

/**
 * Row <-> domain translation.
 *
 * Kept pure and separate from the repository so the exact database column
 * names live in one place: if the schema evolves (or the Dojang OS API takes
 * over), only this file changes.
 */

const optional = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value === '' ? undefined : value

const nullable = (value: string | undefined): string | null =>
  value === undefined || value === '' ? null : value

/* ----------------------------------------------------------- announcements */

export interface AnnouncementRow {
  id: string
  title: string
  body: string
  image_url: string | null
  category: string
  priority: string
  pinned: boolean
  published: boolean
  published_at: string
  expires_at: string | null
  action_label: string | null
  action_url: string | null
  created_at: string
  updated_at: string
}

export function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: optional(row.image_url),
    category: row.category as AnnouncementCategory,
    priority: row.priority as AnnouncementPriority,
    pinned: row.pinned,
    published: row.published,
    publishedAt: row.published_at,
    expiresAt: optional(row.expires_at),
    actionLabel: optional(row.action_label),
    actionUrl: optional(row.action_url),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromAnnouncement(draft: Draft<Announcement>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title,
    body: draft.body,
    image_url: nullable(draft.imageUrl),
    category: draft.category,
    priority: draft.priority,
    pinned: draft.pinned,
    published: draft.published,
    published_at: draft.publishedAt,
    expires_at: nullable(draft.expiresAt),
    action_label: nullable(draft.actionLabel),
    action_url: nullable(draft.actionUrl),
  }
}

/* ------------------------------------------------------------------ events */

export interface EventRow {
  id: string
  title: string
  start_at: string
  end_at: string | null
  all_day: boolean
  location: string | null
  address: string | null
  description: string
  image_url: string | null
  registration_url: string | null
  waiver_url: string | null
  audience: string | null
  featured: boolean
  published: boolean
  published_at: string
  created_at: string
  updated_at: string
}

export function toEvent(row: EventRow): AcademyEvent {
  return {
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    endAt: optional(row.end_at),
    allDay: row.all_day,
    location: optional(row.location),
    address: optional(row.address),
    description: row.description,
    imageUrl: optional(row.image_url),
    registrationUrl: optional(row.registration_url),
    waiverUrl: optional(row.waiver_url),
    audience: optional(row.audience),
    featured: row.featured,
    published: row.published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromEvent(draft: Draft<AcademyEvent>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title,
    start_at: draft.startAt,
    end_at: nullable(draft.endAt),
    all_day: draft.allDay,
    location: nullable(draft.location),
    address: nullable(draft.address),
    description: draft.description,
    image_url: nullable(draft.imageUrl),
    registration_url: nullable(draft.registrationUrl),
    waiver_url: nullable(draft.waiverUrl),
    audience: nullable(draft.audience),
    featured: draft.featured,
    published: draft.published,
    published_at: draft.publishedAt,
  }
}

/* ---------------------------------------------------------------- schedule */

export interface ScheduleRow {
  id: string
  class_name: string
  program_slug: string | null
  day_of_week: number
  start_time: string
  end_time: string
  age_range: string | null
  level: string | null
  description: string | null
  eligibility: string | null
  status: string
  status_note: string | null
  status_date: string | null
  new_start_time: string | null
  new_end_time: string | null
  published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** Postgres `time` columns come back as `HH:MM:SS`; the domain uses `HH:MM`. */
const trimTime = (value: string): string => value.slice(0, 5)

export function toScheduleEntry(row: ScheduleRow): ScheduleEntry {
  return {
    id: row.id,
    className: row.class_name,
    programSlug: optional(row.program_slug),
    dayOfWeek: row.day_of_week as Weekday,
    startTime: trimTime(row.start_time),
    endTime: trimTime(row.end_time),
    ageRange: optional(row.age_range),
    level: optional(row.level),
    description: optional(row.description),
    eligibility: optional(row.eligibility),
    status: row.status as ScheduleStatus,
    statusNote: optional(row.status_note),
    statusDate: optional(row.status_date),
    newStartTime: row.new_start_time ? trimTime(row.new_start_time) : undefined,
    newEndTime: row.new_end_time ? trimTime(row.new_end_time) : undefined,
    published: row.published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromScheduleEntry(draft: Draft<ScheduleEntry>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    class_name: draft.className,
    program_slug: nullable(draft.programSlug),
    day_of_week: draft.dayOfWeek,
    start_time: draft.startTime,
    end_time: draft.endTime,
    age_range: nullable(draft.ageRange),
    level: nullable(draft.level),
    description: nullable(draft.description),
    eligibility: nullable(draft.eligibility),
    status: draft.status,
    status_note: nullable(draft.statusNote),
    status_date: nullable(draft.statusDate),
    new_start_time: nullable(draft.newStartTime),
    new_end_time: nullable(draft.newEndTime),
    published: draft.published,
    sort_order: draft.sortOrder,
  }
}

/* --------------------------------------------------------------- resources */

export interface ResourceRow {
  id: string
  title: string
  description: string | null
  type: string
  collection: string
  program: string | null
  level: string | null
  thumbnail_url: string | null
  video_url: string | null
  document_url: string | null
  external_url: string | null
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

export function toResource(row: ResourceRow): LearningResource {
  return {
    id: row.id,
    title: row.title,
    description: optional(row.description),
    type: row.type as ResourceType,
    collection: row.collection as ResourceCollection,
    program: optional(row.program),
    level: optional(row.level),
    thumbnailUrl: optional(row.thumbnail_url),
    videoUrl: optional(row.video_url),
    documentUrl: optional(row.document_url),
    externalUrl: optional(row.external_url),
    sortOrder: row.sort_order,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromResource(draft: Draft<LearningResource>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title,
    description: nullable(draft.description),
    type: draft.type,
    collection: draft.collection,
    program: nullable(draft.program),
    level: nullable(draft.level),
    thumbnail_url: nullable(draft.thumbnailUrl),
    video_url: nullable(draft.videoUrl),
    document_url: nullable(draft.documentUrl),
    external_url: nullable(draft.externalUrl),
    sort_order: draft.sortOrder,
    published: draft.published,
  }
}

/* ---------------------------------------------------------------- programs */

export interface ProgramRow {
  id: string
  name: string
  slug: string
  age_range: string | null
  summary: string
  description: string | null
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

export function toProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ageRange: optional(row.age_range),
    summary: row.summary,
    description: optional(row.description),
    sortOrder: row.sort_order,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromProgram(draft: Draft<Program>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name,
    slug: draft.slug,
    age_range: nullable(draft.ageRange),
    summary: draft.summary,
    description: nullable(draft.description),
    sort_order: draft.sortOrder,
    published: draft.published,
  }
}

/* -------------------------------------------------------------------- FAQs */

export interface FaqRow {
  id: string
  question: string
  answer: string
  category: string | null
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

export function toFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: optional(row.category),
    sortOrder: row.sort_order,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromFaq(draft: Draft<Faq>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    question: draft.question,
    answer: draft.answer,
    category: nullable(draft.category),
    sort_order: draft.sortOrder,
    published: draft.published,
  }
}

/* ------------------------------------------------------------------- pages */

export interface PageRow {
  id: string
  slug: string
  title: string
  body: string
  published: boolean
  created_at: string
  updated_at: string
}

export function toPage(row: PageRow): Page {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromPage(draft: Draft<Page>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    slug: draft.slug,
    title: draft.title,
    body: draft.body,
    published: draft.published,
  }
}

/* ----------------------------------------------------------------- gallery */

export interface GalleryRow {
  id: string
  title: string | null
  caption: string | null
  image_url: string
  credit: string | null
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

export function toGalleryItem(row: GalleryRow): GalleryItem {
  return {
    id: row.id,
    title: optional(row.title),
    caption: optional(row.caption),
    imageUrl: row.image_url,
    credit: optional(row.credit),
    sortOrder: row.sort_order,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function fromGalleryItem(draft: Draft<GalleryItem>) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: nullable(draft.title),
    caption: nullable(draft.caption),
    image_url: draft.imageUrl,
    credit: nullable(draft.credit),
    sort_order: draft.sortOrder,
    published: draft.published,
  }
}

/* ---------------------------------------------------------------- settings */

export interface SettingsRow {
  id: string
  academy_name: string
  tagline: string | null
  description: string | null
  phone: string | null
  email: string | null
  address_lines: string[] | null
  map_url: string | null
  website_url: string | null
  support_email: string | null
  office_hours: string | null
  social: SocialLinks | null
  updated_at: string
}

export function toSettings(row: SettingsRow): AcademySettings {
  return {
    academyName: row.academy_name,
    tagline: optional(row.tagline),
    description: optional(row.description),
    phone: optional(row.phone),
    email: optional(row.email),
    addressLines: row.address_lines ?? [],
    mapUrl: optional(row.map_url),
    websiteUrl: optional(row.website_url),
    supportEmail: optional(row.support_email),
    officeHours: optional(row.office_hours),
    social: row.social ?? {},
    updatedAt: row.updated_at,
  }
}

export function fromSettings(settings: AcademySettings) {
  return {
    id: 'default',
    academy_name: settings.academyName,
    tagline: nullable(settings.tagline),
    description: nullable(settings.description),
    phone: nullable(settings.phone),
    email: nullable(settings.email),
    address_lines: settings.addressLines,
    map_url: nullable(settings.mapUrl),
    website_url: nullable(settings.websiteUrl),
    support_email: nullable(settings.supportEmail),
    office_hours: nullable(settings.officeHours),
    social: settings.social,
    updated_at: new Date().toISOString(),
  }
}
