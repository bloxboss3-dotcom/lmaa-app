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
import { env } from '@/config/env'
import { DemoRepository } from './demo/demoRepository'
import { LazySupabaseRepository } from './lazy'
import type {
  ContentBundle,
  ContentQueryOptions,
  ContentRepository,
  Draft,
} from './repository'

export * from './repository'
export { DemoRepository } from './demo/demoRepository'
export { createSeedBundle } from './demo/seed'

/**
 * Wraps a live repository so a backend outage never leaves a parent staring at
 * an error screen.
 *
 * Family-facing reads fall back to the built-in content and report themselves
 * as "degraded" so the UI can say so honestly. Admin reads and every WRITE are
 * deliberately NOT wrapped: an administrator must never believe something was
 * saved to the academy's database when it was not.
 */
export class ResilientRepository implements ContentRepository {
  constructor(
    private readonly primary: ContentRepository,
    private readonly fallback: ContentRepository,
    private readonly onDegraded: (degraded: boolean, error?: unknown) => void = () => {},
  ) {}

  get kind() {
    return this.primary.kind
  }

  private async read<T>(
    run: (repo: ContentRepository) => Promise<T>,
    options?: ContentQueryOptions,
  ): Promise<T> {
    try {
      const result = await run(this.primary)
      this.onDegraded(false)
      return result
    } catch (error) {
      // Admin views must see the real failure, not a comforting fiction.
      if (options?.includeUnpublished) throw error
      this.onDegraded(true, error)
      return run(this.fallback)
    }
  }

  getBundle(options?: ContentQueryOptions): Promise<ContentBundle> {
    return this.read((repo) => repo.getBundle(options), options)
  }
  getSettings(): Promise<AcademySettings> {
    return this.read((repo) => repo.getSettings())
  }
  listAnnouncements(options?: ContentQueryOptions): Promise<Announcement[]> {
    return this.read((repo) => repo.listAnnouncements(options), options)
  }
  listEvents(options?: ContentQueryOptions): Promise<AcademyEvent[]> {
    return this.read((repo) => repo.listEvents(options), options)
  }
  listScheduleEntries(options?: ContentQueryOptions): Promise<ScheduleEntry[]> {
    return this.read((repo) => repo.listScheduleEntries(options), options)
  }
  listResources(options?: ContentQueryOptions): Promise<LearningResource[]> {
    return this.read((repo) => repo.listResources(options), options)
  }
  listPrograms(options?: ContentQueryOptions): Promise<Program[]> {
    return this.read((repo) => repo.listPrograms(options), options)
  }
  listFaqs(options?: ContentQueryOptions): Promise<Faq[]> {
    return this.read((repo) => repo.listFaqs(options), options)
  }
  listPages(options?: ContentQueryOptions): Promise<Page[]> {
    return this.read((repo) => repo.listPages(options), options)
  }
  getPage(slug: string, options?: ContentQueryOptions): Promise<Page | null> {
    return this.read((repo) => repo.getPage(slug, options), options)
  }
  listGallery(options?: ContentQueryOptions): Promise<GalleryItem[]> {
    return this.read((repo) => repo.listGallery(options), options)
  }

  saveAnnouncement(draft: Draft<Announcement>) {
    return this.primary.saveAnnouncement(draft)
  }
  deleteAnnouncement(id: string) {
    return this.primary.deleteAnnouncement(id)
  }
  saveEvent(draft: Draft<AcademyEvent>) {
    return this.primary.saveEvent(draft)
  }
  deleteEvent(id: string) {
    return this.primary.deleteEvent(id)
  }
  saveScheduleEntry(draft: Draft<ScheduleEntry>) {
    return this.primary.saveScheduleEntry(draft)
  }
  deleteScheduleEntry(id: string) {
    return this.primary.deleteScheduleEntry(id)
  }
  saveResource(draft: Draft<LearningResource>) {
    return this.primary.saveResource(draft)
  }
  deleteResource(id: string) {
    return this.primary.deleteResource(id)
  }
  saveProgram(draft: Draft<Program>) {
    return this.primary.saveProgram(draft)
  }
  deleteProgram(id: string) {
    return this.primary.deleteProgram(id)
  }
  saveFaq(draft: Draft<Faq>) {
    return this.primary.saveFaq(draft)
  }
  deleteFaq(id: string) {
    return this.primary.deleteFaq(id)
  }
  savePage(draft: Draft<Page>) {
    return this.primary.savePage(draft)
  }
  deletePage(id: string) {
    return this.primary.deletePage(id)
  }
  saveGalleryItem(draft: Draft<GalleryItem>) {
    return this.primary.saveGalleryItem(draft)
  }
  deleteGalleryItem(id: string) {
    return this.primary.deleteGalleryItem(id)
  }
  updateSettings(settings: AcademySettings) {
    return this.primary.updateSettings(settings)
  }
}

export interface RepositoryHandle {
  repository: ContentRepository
  /** `demo` when there is no backend configured. */
  mode: 'demo' | 'supabase'
}

/**
 * Chooses the repository for this deployment.
 * No Supabase configuration => demo content, no errors, no dead screens.
 */
export function createRepository(
  onDegraded: (degraded: boolean, error?: unknown) => void = () => {},
): RepositoryHandle {
  if (!env.isSupabaseConfigured) {
    return { repository: new DemoRepository(), mode: 'demo' }
  }
  return {
    repository: new ResilientRepository(
      new LazySupabaseRepository(),
      new DemoRepository(),
      onDegraded,
    ),
    mode: 'supabase',
  }
}
