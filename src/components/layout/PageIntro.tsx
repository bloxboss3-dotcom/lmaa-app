import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

interface PageIntroProps {
  /** Small grey context line above the title (a date, a section name). */
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Screen opener. Deliberately restrained: one title, optional grey context,
 * and a short description only where it earns its place.
 */
export function PageIntro({ eyebrow, title, description, action, className }: PageIntroProps) {
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Standard screen padding and vertical rhythm. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('space-y-5 px-4 py-5 md:px-6', className)}>{children}</div>
}
