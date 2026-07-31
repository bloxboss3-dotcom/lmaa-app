/**
 * Defensive localStorage helpers.
 *
 * Safari private mode, locked-down enterprise browsers and full disks all make
 * storage throw. Nothing in this app is important enough to break a family's
 * screen over, so every failure degrades quietly to an in-memory value.
 *
 * Only non-sensitive data belongs here: read/unread marks, UI preferences and
 * (in demo mode) editable demo content.
 */

const memory = new Map<string, string>()

function backend(): Storage | null {
  try {
    const probe = '__lmaa_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

let cached: Storage | null | undefined

function store(): Storage | null {
  if (cached === undefined) cached = typeof window === 'undefined' ? null : backend()
  return cached
}

export const isPersistentStorageAvailable = (): boolean => store() !== null

export function readString(key: string): string | null {
  const target = store()
  if (!target) return memory.get(key) ?? null
  try {
    return target.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

export function writeString(key: string, value: string): void {
  memory.set(key, value)
  const target = store()
  if (!target) return
  try {
    target.setItem(key, value)
  } catch {
    /* quota or privacy mode — the in-memory copy still works for this session */
  }
}

export function removeKey(key: string): void {
  memory.delete(key)
  const target = store()
  if (!target) return
  try {
    target.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    writeString(key, JSON.stringify(value))
  } catch {
    /* circular or unserialisable — never a user-facing failure */
  }
}

/** Namespaced keys keep demo content, prefs and read marks from colliding. */
export const STORAGE_KEYS = {
  demoContent: 'lmaa.demo-content.v1',
  demoSession: 'lmaa.demo-session.v1',
  readAnnouncements: 'lmaa.read-announcements.v1',
  installPromptDismissed: 'lmaa.install-dismissed.v1',
  notificationPrefs: 'lmaa.notification-prefs.v1',
  scheduleFilters: 'lmaa.schedule-filters.v1',
} as const
