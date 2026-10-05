import type {
  AcademyEvent,
  AcademySettings,
  Announcement,
  ContactMessage,
  ContactMessageDraft,
  Faq,
  MessageStatus,
  GalleryItem,
  Page,
  Program,
  LearningResource,
  ScheduleEntry,
  Timestamped,
} from '@/domain/types'
import { STORAGE_KEYS, readJson, removeKey, writeJson } from '@/lib/storage'
import {
  ContentError,
  type ContentBundle,
  type ContentQueryOptions,
  type ContentRepository,
  type Draft,
  newId,
  nowIso,
} from '../repository'
import { createSeedBundle, seedMessages } from './seed'

/**
 * Demo repository: the app fully works before any backend exists.
 *
 * Reads come from the seed bundle. Admin edits are layered on top and stored
 * in localStorage on this device only, which is exactly what a demo should be:
 * convincing to click through, impossible to mistake for a real CMS.
 */

interface StoredBundle {
  version: 1
  savedAt: string
  bundle: ContentBundle
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

type Collection = Exclude<keyof ContentBundle, 'settings'>

export class DemoRepository implements ContentRepository {
  readonly kind = 'demo' as const

  private cache: ContentBundle | null = null

  constructor(private readonly clock: () => Date = () => new Date()) {}

  /** True when an administrator has saved demo changes on this device. */
  hasLocalEdits(): boolean {
    return readJson<StoredBundle | null>(STORAGE_KEYS.demoContent, null) !== null
  }

  /** Throws away local demo edits and returns to the shipped seed content. */
  resetLocalEdits(): void {
    removeKey(STORAGE_KEYS.demoContent)
    this.cache = null
  }

  private load(): ContentBundle {
    if (this.cache) return this.cache
    const stored = readJson<StoredBundle | null>(STORAGE_KEYS.demoContent, null)
    if (stored?.bundle) {
      const seed = createSeedBundle(this.clock())
      // Merge so newly-added seed fields don't break an older saved bundle.
      this.cache = {
        ...seed,
        ...stored.bundle,
        settings: { ...seed.settings, ...stored.bundle.settings },
      }
    } else {
      this.cache = createSeedBundle(this.clock())
    }
    return this.cache
  }

  private persist(): void {
    const bundle = this.load()
    writeJson(STORAGE_KEYS.demoContent, {
      version: 1,
      savedAt: nowIso(),
      bundle,
    } satisfies StoredBundle)
  }

  private published<T extends { published: boolean }>(
    rows: T[],
    options?: ContentQueryOptions,
  ): T[] {
    return options?.includeUnpublished ? rows : rows.filter((row) => row.published)
  }

  /* ------------------------------------------------------------- reading */

  async getBundle(options?: ContentQueryOptions): Promise<ContentBundle> {
    const bundle = this.load()
    return clone({
      settings: bundle.settings,
      announcements: this.published(bundle.announcements, options),
      events: this.published(bundle.events, options),
      schedule: this.published(bundle.schedule, options),
      resources: this.published(bundle.resources, options),
      programs: this.published(bundle.programs, options),
      faqs: this.published(bundle.faqs, options),
      pages: this.published(bundle.pages, options),
      gallery: this.published(bundle.gallery, options),
    })
  }

  async getSettings(): Promise<AcademySettings> {
    return clone(this.load().settings)
  }

  async listAnnouncements(options?: ContentQueryOptions): Promise<Announcement[]> {
    return clone(this.published(this.load().announcements, options))
  }

  async listEvents(options?: ContentQueryOptions): Promise<AcademyEvent[]> {
    return clone(this.published(this.load().events, options))
  }

  async listScheduleEntries(options?: ContentQueryOptions): Promise<ScheduleEntry[]> {
    return clone(this.published(this.load().schedule, options))
  }

  async listResources(options?: ContentQueryOptions): Promise<LearningResource[]> {
    return clone(this.published(this.load().resources, options))
  }

  async listPrograms(options?: ContentQueryOptions): Promise<Program[]> {
    return clone(this.published(this.load().programs, options))
  }

  async listFaqs(options?: ContentQueryOptions): Promise<Faq[]> {
    return clone(this.published(this.load().faqs, options))
  }

  async listPages(options?: ContentQueryOptions): Promise<Page[]> {
    return clone(this.published(this.load().pages, options))
  }

  async getPage(slug: string, options?: ContentQueryOptions): Promise<Page | null> {
    const page = this.published(this.load().pages, options).find((item) => item.slug === slug)
    return page ? clone(page) : null
  }

  async listGallery(options?: ContentQueryOptions): Promise<GalleryItem[]> {
    return clone(this.published(this.load().gallery, options))
  }

  /* ------------------------------------------------------------- writing */

  private upsert<T extends Timestamped & { id: string }>(
    collection: Collection,
    draft: Draft<T>,
  ): T {
    const bundle = this.load()
    const rows = bundle[collection] as unknown as T[]
    const timestamp = nowIso()

    if (draft.id) {
      const index = rows.findIndex((row) => row.id === draft.id)
      if (index >= 0) {
        const updated = {
          ...rows[index],
          ...draft,
          // Once a human edits demo content it is no longer sample content.
          isSample: false,
          updatedAt: timestamp,
        } as T
        rows[index] = updated
        this.persist()
        return clone(updated)
      }
    }

    const created = {
      ...draft,
      id: draft.id ?? newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as unknown as T
    rows.unshift(created)
    this.persist()
    return clone(created)
  }

  private remove(collection: Collection, id: string): void {
    const bundle = this.load()
    const rows = bundle[collection] as unknown as { id: string }[]
    const index = rows.findIndex((row) => row.id === id)
    if (index >= 0) rows.splice(index, 1)
    this.persist()
  }

  async saveAnnouncement(draft: Draft<Announcement>): Promise<Announcement> {
    return this.upsert<Announcement>('announcements', draft)
  }
  async deleteAnnouncement(id: string): Promise<void> {
    this.remove('announcements', id)
  }

  async saveEvent(draft: Draft<AcademyEvent>): Promise<AcademyEvent> {
    return this.upsert<AcademyEvent>('events', draft)
  }
  async deleteEvent(id: string): Promise<void> {
    this.remove('events', id)
  }

  async saveScheduleEntry(draft: Draft<ScheduleEntry>): Promise<ScheduleEntry> {
    return this.upsert<ScheduleEntry>('schedule', draft)
  }
  async deleteScheduleEntry(id: string): Promise<void> {
    this.remove('schedule', id)
  }

  async saveResource(draft: Draft<LearningResource>): Promise<LearningResource> {
    return this.upsert<LearningResource>('resources', draft)
  }
  async deleteResource(id: string): Promise<void> {
    this.remove('resources', id)
  }

  async saveProgram(draft: Draft<Program>): Promise<Program> {
    return this.upsert<Program>('programs', draft)
  }
  async deleteProgram(id: string): Promise<void> {
    this.remove('programs', id)
  }

  async saveFaq(draft: Draft<Faq>): Promise<Faq> {
    return this.upsert<Faq>('faqs', draft)
  }
  async deleteFaq(id: string): Promise<void> {
    this.remove('faqs', id)
  }

  async savePage(draft: Draft<Page>): Promise<Page> {
    return this.upsert<Page>('pages', draft)
  }
  async deletePage(id: string): Promise<void> {
    this.remove('pages', id)
  }

  async saveGalleryItem(draft: Draft<GalleryItem>): Promise<GalleryItem> {
    return this.upsert<GalleryItem>('gallery', draft)
  }
  async deleteGalleryItem(id: string): Promise<void> {
    this.remove('gallery', id)
  }

  async updateSettings(settings: AcademySettings): Promise<AcademySettings> {
    const bundle = this.load()
    bundle.settings = { ...settings, updatedAt: nowIso() }
    this.persist()
    return clone(bundle.settings)
  }

  /* ------------------------------------------------------------ messages */

  // Kept apart from the content bundle: messages are private, and the family
  // screens never load them. In demo mode the family form opens the mail app
  // instead of calling sendMessage, so what lands here is only ever the
  // sample message and anything a developer sends on purpose.
  private loadMessages(): ContactMessage[] {
    const stored = readJson<ContactMessage[] | null>(STORAGE_KEYS.demoMessages, null)
    return stored ?? seedMessages(this.clock())
  }

  private persistMessages(messages: ContactMessage[]): void {
    writeJson(STORAGE_KEYS.demoMessages, messages)
  }

  async sendMessage(draft: ContactMessageDraft): Promise<void> {
    const messages = this.loadMessages()
    messages.unshift({ ...draft, id: newId(), status: 'new', createdAt: nowIso() })
    this.persistMessages(messages)
  }

  async listMessages(): Promise<ContactMessage[]> {
    return clone(
      [...this.loadMessages()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    )
  }

  async setMessageStatus(id: string, status: MessageStatus): Promise<ContactMessage> {
    const messages = this.loadMessages()
    const index = messages.findIndex((message) => message.id === id)
    if (index < 0) throw new ContentError('That message no longer exists.')
    const updated: ContactMessage = {
      ...messages[index],
      status,
      handledAt: status === 'handled' ? nowIso() : undefined,
    }
    messages[index] = updated
    this.persistMessages(messages)
    return clone(updated)
  }
}
