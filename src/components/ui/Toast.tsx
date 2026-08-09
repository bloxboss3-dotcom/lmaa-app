import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from './Icon'
import { ToastContext, type ToastTone } from './toastContext'

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

const TONE_STYLES: Record<ToastTone, { className: string; icon: IconName }> = {
  // Toasts float over the page, so they are solid rather than tinted — a pale
  // chip on pale paper is easy to miss entirely.
  success: { className: 'bg-ink-900 text-white', icon: 'check' },
  error: { className: 'bg-crimson-700 text-white', icon: 'alert' },
  info: { className: 'bg-ink-900 text-white', icon: 'info' },
}

/** Success/error feedback for every admin action. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, tone, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 5000)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3',
              'text-sm font-medium shadow-[var(--shadow-lift)] animate-[var(--animate-fade-up)]',
              TONE_STYLES[toast.tone].className,
            )}
          >
            <Icon name={TONE_STYLES[toast.tone].icon} size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
