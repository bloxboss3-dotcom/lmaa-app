import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

interface PageIntroProps {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Consistent screen opener: small eyebrow, strong title, optional action. */
export function PageIntro({ eyebrow, title, description, action, className }: PageIntroProps) {
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[0.68rem] font-bold tracking-[0.16em] text-crimson-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[1.7rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Standard page padding so every screen lines up. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('space-y-6 px-4 py-5 md:px-6 md:py-7', className)}>{children}</div>
}
