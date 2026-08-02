import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage'

/**
 * Progressive Web App plumbing: update prompts and the install experience.
 */

export interface AppUpdateState {
  /** A new version is downloaded and waiting for the family to accept it. */
  updateReady: boolean
  offlineReady: boolean
  applyUpdate: () => void
  dismiss: () => void
}

export function useAppUpdate(): AppUpdateState {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('[LMAA] Service worker registration failed', error)
    },
  })

  const applyUpdate = useCallback(() => {
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  const dismiss = useCallback(() => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }, [setNeedRefresh, setOfflineReady])

  return { updateReady: needRefresh, offlineReady, applyUpdate, dismiss }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** The browser offered a native install prompt we can trigger. */
  canPrompt: boolean
  /** Already running from the home screen / installed app. */
  isInstalled: boolean
  /** iOS needs manual Share -> Add to Home Screen instructions. */
  isIos: boolean
  dismissed: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  dismiss: () => void
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() =>
    readJson<boolean>(STORAGE_KEYS.installPromptDismissed, false),
  )
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setIsInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    setIsInstalled(Boolean(standalone))

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const isIos =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1))

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome
  }, [deferred])

  const dismiss = useCallback(() => {
    setDismissed(true)
    writeJson(STORAGE_KEYS.installPromptDismissed, true)
  }, [])

  return {
    canPrompt: deferred !== null,
    isInstalled,
    isIos,
    dismissed,
    promptInstall,
    dismiss,
  }
}
