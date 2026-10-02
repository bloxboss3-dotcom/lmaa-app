import { useCallback } from 'react'
import { toggleClassName } from '@/domain/myClasses'
import { useStoredState } from '@/lib/hooks'
import { STORAGE_KEYS } from '@/lib/storage'

/**
 * The classes this family attends, kept on this device only.
 *
 * Deliberately not shared with the server: it would be the first piece of
 * information about a specific child the app held, and version one holds none.
 */
export function useMyClasses() {
  const [mine, setMine] = useStoredState<string[]>(STORAGE_KEYS.myClasses, [])
  const toggle = useCallback(
    (name: string) => setMine(toggleClassName(mine, name)),
    [mine, setMine],
  )
  return { mine, toggle, setMine }
}
