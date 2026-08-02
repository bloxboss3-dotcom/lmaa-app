import type { SupabaseClient } from '@supabase/supabase-js'
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
import {
  ContentError,
  type ContentBundle,
  type ContentQueryOptions,
  type ContentRepository,
  type Draft,
} from '../repository'
import { seedSettings } from '../demo/seed'
import * as map from './mappers'

/**
 * Supabase-backed content repository.
 *
 * Security model: this client only ever holds the browser-safe publishable
 * key. Whether a given read or write is allowed is decided by Row Level
 * Security in the database — never by this file. Unpublished content simply
 * does not come back for anonymous visitors.
 */

export const TABLES = {
  announcements: 'announcements',
  events: 'events',
  schedule: 'schedule_entries',
  resources: 'learning_resources',
  programs: 'programs',
  faqs: 'faqs',
  pages: 'pages',
  gallery: 'gallery_items',
  settings: 'app_settings',
} as const

export class SupabaseRepository implements ContentRepository {
  readonly kind = 'supabase' as const

  constructor(private readonly client: SupabaseClient) {}

  private fail(what: string, error: unknown): never {
    throw new ContentError(`Could not load ${what}.`, error)
  }

  private publishedFilter<T>(query: T, options?: ContentQueryOptions): T {
    if (options?.includeUnpublished) return query
    // Belt and braces: RLS already hides unpublished rows from anonymous
    // visitors, but an authenticated admin browsing the family screens should
    // see exactly what families see.
    return (query as { eq: (column: string, value: unknown) => T }).eq('published', true)
  }

  /* ------------------------------------------------------------- reading */

  async getBundle(options?: ContentQueryOptions): Promise<ContentBundle> {
    const [settings, announcements, events, schedule, resources, programs, faqs, pages, gallery] =
      await Promise.all([
        this.getSettings(),
        this.listAnnouncements(options),
        this.listEvents(options),
        this.listScheduleEntries(options),
        this.listResources(options),
        this.listPrograms(options),
        this.listFaqs(options),
        this.listPages(options),
        this.listGallery(options),
      ])
    return { settings, announcements, events, schedule, resources, programs, faqs, pages, gallery }
  }

  async getSettings(): Promise<AcademySettings> {
    const { data, error } = await this.client
      .from(TABLES.settings)
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
    if (error) this.fail('academy information', error)
    // A brand-new project has no settings row yet; fall back to safe defaults
    // rather than showing families an error.
    return data ? map.toSettings(data as map.SettingsRow) : seedSettings()
  }

  async listAnnouncements(options?: ContentQueryOptions): Promise<Announcement[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.announcements).select('*'),
      options,
    ).order('published_at', { ascending: false })
    if (error) this.fail('academy updates', error)
    return (data ?? []).map((row) => map.toAnnouncement(row as map.AnnouncementRow))
  }

  async listEvents(options?: ContentQueryOptions): Promise<AcademyEvent[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.events).select('*'),
      options,
    ).order('start_at', { ascending: true })
    if (error) this.fail('events', error)
    return (data ?? []).map((row) => map.toEvent(row as map.EventRow))
  }

  async listScheduleEntries(options?: ContentQueryOptions): Promise<ScheduleEntry[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.schedule).select('*'),
      options,
    )
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
    if (error) this.fail('the class schedule', error)
    return (data ?? []).map((row) => map.toScheduleEntry(row as map.ScheduleRow))
  }

  async listResources(options?: ContentQueryOptions): Promise<LearningResource[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.resources).select('*'),
      options,
    ).order('sort_order', { ascending: true })
    if (error) this.fail('learning resources', error)
    return (data ?? []).map((row) => map.toResource(row as map.ResourceRow))
  }

  async listPrograms(options?: ContentQueryOptions): Promise<Program[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.programs).select('*'),
      options,
    ).order('sort_order', { ascending: true })
    if (error) this.fail('programs', error)
    return (data ?? []).map((row) => map.toProgram(row as map.ProgramRow))
  }

  async listFaqs(options?: ContentQueryOptions): Promise<Faq[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.faqs).select('*'),
      options,
    ).order('sort_order', { ascending: true })
    if (error) this.fail('frequently asked questions', error)
    return (data ?? []).map((row) => map.toFaq(row as map.FaqRow))
  }

  async listPages(options?: ContentQueryOptions): Promise<Page[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.pages).select('*'),
      options,
    ).order('slug', { ascending: true })
    if (error) this.fail('academy information pages', error)
    return (data ?? []).map((row) => map.toPage(row as map.PageRow))
  }

  async getPage(slug: string, options?: ContentQueryOptions): Promise<Page | null> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.pages).select('*').eq('slug', slug),
      options,
    ).maybeSingle()
    if (error) this.fail('that page', error)
    return data ? map.toPage(data as map.PageRow) : null
  }

  async listGallery(options?: ContentQueryOptions): Promise<GalleryItem[]> {
    const { data, error } = await this.publishedFilter(
      this.client.from(TABLES.gallery).select('*'),
      options,
    ).order('sort_order', { ascending: true })
    if (error) this.fail('the photo gallery', error)
    return (data ?? []).map((row) => map.toGalleryItem(row as map.GalleryRow))
  }

  /* ------------------------------------------------------------- writing */

  private async upsert<Row, Result>(
    table: string,
    payload: Record<string, unknown>,
    toDomain: (row: Row) => Result,
    label: string,
  ): Promise<Result> {
    const { data, error } = await this.client
      .from(table)
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw new ContentError(`Could not save this ${label}.`, error)
    return toDomain(data as Row)
  }

  private async removeRow(table: string, id: string, label: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id)
    if (error) throw new ContentError(`Could not delete this ${label}.`, error)
  }

  saveAnnouncement(draft: Draft<Announcement>): Promise<Announcement> {
    return this.upsert(
      TABLES.announcements,
      map.fromAnnouncement(draft),
      map.toAnnouncement,
      'update',
    )
  }
  deleteAnnouncement(id: string): Promise<void> {
    return this.removeRow(TABLES.announcements, id, 'update')
  }

  saveEvent(draft: Draft<AcademyEvent>): Promise<AcademyEvent> {
    return this.upsert(TABLES.events, map.fromEvent(draft), map.toEvent, 'event')
  }
  deleteEvent(id: string): Promise<void> {
    return this.removeRow(TABLES.events, id, 'event')
  }

  saveScheduleEntry(draft: Draft<ScheduleEntry>): Promise<ScheduleEntry> {
    return this.upsert(
      TABLES.schedule,
      map.fromScheduleEntry(draft),
      map.toScheduleEntry,
      'class',
    )
  }
  deleteScheduleEntry(id: string): Promise<void> {
    return this.removeRow(TABLES.schedule, id, 'class')
  }

  saveResource(draft: Draft<LearningResource>): Promise<LearningResource> {
    return this.upsert(TABLES.resources, map.fromResource(draft), map.toResource, 'resource')
  }
  deleteResource(id: string): Promise<void> {
    return this.removeRow(TABLES.resources, id, 'resource')
  }

  saveProgram(draft: Draft<Program>): Promise<Program> {
    return this.upsert(TABLES.programs, map.fromProgram(draft), map.toProgram, 'program')
  }
  deleteProgram(id: string): Promise<void> {
    return this.removeRow(TABLES.programs, id, 'program')
  }

  saveFaq(draft: Draft<Faq>): Promise<Faq> {
    return this.upsert(TABLES.faqs, map.fromFaq(draft), map.toFaq, 'question')
  }
  deleteFaq(id: string): Promise<void> {
    return this.removeRow(TABLES.faqs, id, 'question')
  }

  savePage(draft: Draft<Page>): Promise<Page> {
    return this.upsert(TABLES.pages, map.fromPage(draft), map.toPage, 'page')
  }
  deletePage(id: string): Promise<void> {
    return this.removeRow(TABLES.pages, id, 'page')
  }

  saveGalleryItem(draft: Draft<GalleryItem>): Promise<GalleryItem> {
    return this.upsert(TABLES.gallery, map.fromGalleryItem(draft), map.toGalleryItem, 'photo')
  }
  deleteGalleryItem(id: string): Promise<void> {
    return this.removeRow(TABLES.gallery, id, 'photo')
  }

  async updateSettings(settings: AcademySettings): Promise<AcademySettings> {
    const { data, error } = await this.client
      .from(TABLES.settings)
      .upsert(map.fromSettings(settings), { onConflict: 'id' })
      .select()
      .single()
    if (error) throw new ContentError('Could not save the academy information.', error)
    return map.toSettings(data as map.SettingsRow)
  }
}
