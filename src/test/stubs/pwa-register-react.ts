import { useState } from 'react'

/**
 * Test stub for `virtual:pwa-register/react`.
 * The real module only exists inside a Vite build with the PWA plugin.
 */
export function useRegisterSW(_options?: unknown) {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async (_reload?: boolean) => {},
  }
}
