import { useSyncExternalStore } from 'react'
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage'

/**
 * Read/unread marks for announcements.
 *
 * Deliberately device-local: no account, no server, nothing about a family
 * leaves the phone. A tiny external store keeps the tab badge and the feed in
 * sync without threading state through the whole tree.
 */

let readIds: string[] = readJson<string[]>(STORAGE_KEYS.readAnnouncements, [])
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return readIds
}

export function useReadAnnouncementIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function markAnnouncementRead(id: string): void {
  if (readIds.includes(id)) return
  // Cap the history so storage cannot grow without bound.
  readIds = [...readIds, id].slice(-500)
  writeJson(STORAGE_KEYS.readAnnouncements, readIds)
  emit()
}

export function markAllAnnouncementsRead(ids: string[]): void {
  const merged = new Set([...readIds, ...ids])
  readIds = [...merged].slice(-500)
  writeJson(STORAGE_KEYS.readAnnouncements, readIds)
  emit()
}

export function resetReadAnnouncements(): void {
  readIds = []
  writeJson(STORAGE_KEYS.readAnnouncements, readIds)
  emit()
}
