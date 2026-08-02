/**
 * Native integration boundary.
 *
 * Everything that behaves differently on the web, in an iOS app and in an
 * Android app goes through this object. Today there is exactly one
 * implementation (web). When the Capacitor build happens, add a native
 * implementation here — no feature screen has to change.
 *
 * See NATIVE_APP_RELEASE_CHECKLIST.md.
 */

export type PlatformName = 'web' | 'ios' | 'android'

export interface ShareRequest {
  title: string
  text?: string
  url?: string
}

export interface PlatformBridge {
  readonly name: PlatformName
  readonly isNative: boolean
  /** True when the OS share sheet is available. */
  readonly canShare: boolean
  share(request: ShareRequest): Promise<boolean>
  openExternal(url: string): void
  /** Saves a generated file (used for "Add to calendar"). */
  saveFile(fileName: string, mimeType: string, contents: string): void
}

function detectName(): PlatformName {
  const capacitor = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const platform = capacitor?.getPlatform?.()
  if (platform === 'ios' || platform === 'android') return platform
  return 'web'
}

export const webPlatform: PlatformBridge = {
  name: 'web',
  isNative: false,
  get canShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  },
  async share(request) {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
    try {
      await navigator.share(request)
      return true
    } catch {
      // User cancelled, or the browser refused — not an error worth surfacing.
      return false
    }
  },
  openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  saveFile(fileName, mimeType, contents) {
    const blob = new Blob([contents], { type: mimeType })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    // Give Safari a moment before revoking, otherwise the download aborts.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
  },
}

let bridge: PlatformBridge = webPlatform

export function getPlatform(): PlatformBridge {
  const name = detectName()
  if (name !== 'web' && bridge.name === 'web') {
    // A native shell is present but no native bridge has been registered yet:
    // the web implementation still works inside the WebView.
    return { ...webPlatform, name, isNative: true }
  }
  return bridge
}

/** Used by the future Capacitor build to install native implementations. */
export function registerPlatform(implementation: PlatformBridge): void {
  bridge = implementation
}
