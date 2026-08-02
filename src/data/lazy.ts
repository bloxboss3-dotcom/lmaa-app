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
  StaffRole,
} from '@/domain/types'
import type { AuthService, StaffSession } from './auth'
import type { ContentBundle, ContentQueryOptions, ContentRepository, Draft } from './repository'

/**
 * Lazy Supabase loading.
 *
 * The Supabase client is ~35 kB gzipped. A deployment running on demo content
 * should never download it, and even a connected deployment can fetch it
 * alongside the first content request instead of blocking first paint. These
 * proxies keep the synchronous factory API while the real module arrives via a
 * dynamic import.
 */

async function loadSupabaseRepository(): Promise<ContentRepository> {
  const [{ getSupabaseClient }, { SupabaseRepository }] = await Promise.all([
    import('./supabase/client'),
    import('./supabase/supabaseRepository'),
  ])
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured')
  return new SupabaseRepository(client)
}

export class LazySupabaseRepository implements ContentRepository {
  readonly kind = 'supabase' as const
  private pending: Promise<ContentRepository> | null = null

  private repo(): Promise<ContentRepository> {
    if (!this.pending) {
      this.pending = loadSupabaseRepository().catch((error) => {
        // Allow a later attempt to retry instead of caching the failure.
        this.pending = null
        throw error
      })
    }
    return this.pending
  }

  async getBundle(options?: ContentQueryOptions): Promise<ContentBundle> {
    return (await this.repo()).getBundle(options)
  }
  async getSettings(): Promise<AcademySettings> {
    return (await this.repo()).getSettings()
  }
  async listAnnouncements(options?: ContentQueryOptions): Promise<Announcement[]> {
    return (await this.repo()).listAnnouncements(options)
  }
  async listEvents(options?: ContentQueryOptions): Promise<AcademyEvent[]> {
    return (await this.repo()).listEvents(options)
  }
  async listScheduleEntries(options?: ContentQueryOptions): Promise<ScheduleEntry[]> {
    return (await this.repo()).listScheduleEntries(options)
  }
  async listResources(options?: ContentQueryOptions): Promise<LearningResource[]> {
    return (await this.repo()).listResources(options)
  }
  async listPrograms(options?: ContentQueryOptions): Promise<Program[]> {
    return (await this.repo()).listPrograms(options)
  }
  async listFaqs(options?: ContentQueryOptions): Promise<Faq[]> {
    return (await this.repo()).listFaqs(options)
  }
  async listPages(options?: ContentQueryOptions): Promise<Page[]> {
    return (await this.repo()).listPages(options)
  }
  async getPage(slug: string, options?: ContentQueryOptions): Promise<Page | null> {
    return (await this.repo()).getPage(slug, options)
  }
  async listGallery(options?: ContentQueryOptions): Promise<GalleryItem[]> {
    return (await this.repo()).listGallery(options)
  }

  async saveAnnouncement(draft: Draft<Announcement>) {
    return (await this.repo()).saveAnnouncement(draft)
  }
  async deleteAnnouncement(id: string) {
    return (await this.repo()).deleteAnnouncement(id)
  }
  async saveEvent(draft: Draft<AcademyEvent>) {
    return (await this.repo()).saveEvent(draft)
  }
  async deleteEvent(id: string) {
    return (await this.repo()).deleteEvent(id)
  }
  async saveScheduleEntry(draft: Draft<ScheduleEntry>) {
    return (await this.repo()).saveScheduleEntry(draft)
  }
  async deleteScheduleEntry(id: string) {
    return (await this.repo()).deleteScheduleEntry(id)
  }
  async saveResource(draft: Draft<LearningResource>) {
    return (await this.repo()).saveResource(draft)
  }
  async deleteResource(id: string) {
    return (await this.repo()).deleteResource(id)
  }
  async saveProgram(draft: Draft<Program>) {
    return (await this.repo()).saveProgram(draft)
  }
  async deleteProgram(id: string) {
    return (await this.repo()).deleteProgram(id)
  }
  async saveFaq(draft: Draft<Faq>) {
    return (await this.repo()).saveFaq(draft)
  }
  async deleteFaq(id: string) {
    return (await this.repo()).deleteFaq(id)
  }
  async savePage(draft: Draft<Page>) {
    return (await this.repo()).savePage(draft)
  }
  async deletePage(id: string) {
    return (await this.repo()).deletePage(id)
  }
  async saveGalleryItem(draft: Draft<GalleryItem>) {
    return (await this.repo()).saveGalleryItem(draft)
  }
  async deleteGalleryItem(id: string) {
    return (await this.repo()).deleteGalleryItem(id)
  }
  async updateSettings(settings: AcademySettings) {
    return (await this.repo()).updateSettings(settings)
  }
}

/** Same idea for authentication. */
export class LazySupabaseAuthService implements AuthService {
  readonly kind = 'supabase' as const
  private pending: Promise<AuthService> | null = null

  private service(): Promise<AuthService> {
    if (!this.pending) {
      this.pending = import('./supabase/supabaseAuth')
        .then(({ SupabaseAuthService }) => new SupabaseAuthService())
        .catch((error) => {
          this.pending = null
          throw error
        })
    }
    return this.pending
  }

  async getSession(): Promise<StaffSession | null> {
    return (await this.service()).getSession()
  }

  async signIn(credentials: { email: string; password: string }): Promise<StaffSession> {
    return (await this.service()).signIn(credentials)
  }

  async signOut(): Promise<void> {
    return (await this.service()).signOut()
  }

  onChange(listener: (session: StaffSession | null) => void): () => void {
    let unsubscribe: (() => void) | null = null
    let cancelled = false
    void this.service().then((service) => {
      if (cancelled) return
      unsubscribe = service.onChange(listener)
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }
}

/** Roles are only meaningful once a session exists; re-exported for clarity. */
export type { StaffRole }
