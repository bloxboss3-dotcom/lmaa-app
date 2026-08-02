import type {
  AcademyEvent,
  AcademySettings,
  Announcement,
  Faq,
  GalleryItem,
  LearningResource,
  Page,
  Program,
  ScheduleEntry,
} from '@/domain/types'

/**
 * The content boundary of the app.
 *
 * Screens never talk to Supabase (or localStorage) directly — they ask a
 * `ContentRepository`. That is what lets the same UI run on seeded demo
 * content today, on Supabase tomorrow, and on the LMAA Dojang OS API later
 * without rewriting a single screen.
 */

export interface ContentQueryOptions {
  /**
   * Include drafts / scheduled / unpublished records.
   * Family-facing screens never set this. In Supabase mode the database's Row
   * Level Security still has the final say.
   */
  includeUnpublished?: boolean
}

/** Everything the app needs for one render pass, fetched together. */
export interface ContentBundle {
  settings: AcademySettings
  announcements: Announcement[]
  events: AcademyEvent[]
  schedule: ScheduleEntry[]
  resources: LearningResource[]
  programs: Program[]
  faqs: Faq[]
  pages: Page[]
  gallery: GalleryItem[]
}

export interface ContentReader {
  /** Which implementation is answering — surfaced in the admin area only. */
  readonly kind: 'demo' | 'supabase'
  getBundle(options?: ContentQueryOptions): Promise<ContentBundle>
  getSettings(): Promise<AcademySettings>
  listAnnouncements(options?: ContentQueryOptions): Promise<Announcement[]>
  listEvents(options?: ContentQueryOptions): Promise<AcademyEvent[]>
  listScheduleEntries(options?: ContentQueryOptions): Promise<ScheduleEntry[]>
  listResources(options?: ContentQueryOptions): Promise<LearningResource[]>
  listPrograms(options?: ContentQueryOptions): Promise<Program[]>
  listFaqs(options?: ContentQueryOptions): Promise<Faq[]>
  listPages(options?: ContentQueryOptions): Promise<Page[]>
  getPage(slug: string, options?: ContentQueryOptions): Promise<Page | null>
  listGallery(options?: ContentQueryOptions): Promise<GalleryItem[]>
}

/** Records the admin area can create/update. `id` absent = create. */
export type Draft<T> = Omit<T, 'createdAt' | 'updatedAt' | 'id'> & { id?: string }

export interface ContentWriter {
  saveAnnouncement(draft: Draft<Announcement>): Promise<Announcement>
  deleteAnnouncement(id: string): Promise<void>

  saveEvent(draft: Draft<AcademyEvent>): Promise<AcademyEvent>
  deleteEvent(id: string): Promise<void>

  saveScheduleEntry(draft: Draft<ScheduleEntry>): Promise<ScheduleEntry>
  deleteScheduleEntry(id: string): Promise<void>

  saveResource(draft: Draft<LearningResource>): Promise<LearningResource>
  deleteResource(id: string): Promise<void>

  saveProgram(draft: Draft<Program>): Promise<Program>
  deleteProgram(id: string): Promise<void>

  saveFaq(draft: Draft<Faq>): Promise<Faq>
  deleteFaq(id: string): Promise<void>

  savePage(draft: Draft<Page>): Promise<Page>
  deletePage(id: string): Promise<void>

  saveGalleryItem(draft: Draft<GalleryItem>): Promise<GalleryItem>
  deleteGalleryItem(id: string): Promise<void>

  updateSettings(settings: AcademySettings): Promise<AcademySettings>
}

export type ContentRepository = ContentReader & ContentWriter

/** Thrown by repositories so the UI can show a friendly message, not a stack. */
export class ContentError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'ContentError'
  }
}

/** Stable, collision-free ids without pulling in a uuid dependency. */
export function newId(): string {
  const cryptoRef = globalThis.crypto
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
