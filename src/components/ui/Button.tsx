import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-crimson-600 text-white hover:bg-crimson-700 active:bg-crimson-800',
  secondary: 'bg-surface text-ink-800 border border-ink-200 hover:bg-ink-50',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  dark: 'bg-ink-900 text-canvas hover:bg-ink-700',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[0.8125rem] gap-1.5 rounded-lg',
  md: 'min-h-11 px-4 text-sm gap-2 rounded-lg',
  lg: 'min-h-12 px-5 text-[0.9375rem] gap-2 rounded-lg',
}

// Medium weight, not bold: buttons no longer have to compete with headings.
const BASE =
  'inline-flex items-center justify-center font-medium transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  fullWidth?: boolean
  children?: ReactNode
  className?: string
}

export interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} /> : null}
    </button>
  )
}

interface LinkButtonProps extends CommonProps {
  to: string
  'aria-label'?: string
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} /> : null}
    </Link>
  )
}

interface ExternalButtonProps extends CommonProps {
  href?: string
  /** Shown (and announced) when the academy has not supplied the detail yet. */
  disabledReason?: string
  target?: string
}

export function ExternalButton({
  href,
  disabledReason,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  target = '_blank',
}: ExternalButtonProps) {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        aria-label={disabledReason ? `${String(children)} — ${disabledReason}` : undefined}
        className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      >
        {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
        {children}
      </button>
    )
  }
  const isInPageProtocol = href.startsWith('tel:') || href.startsWith('mailto:')
  return (
    <a
      href={href}
      target={isInPageProtocol ? undefined : target}
      rel={isInPageProtocol ? undefined : 'noopener noreferrer'}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} /> : null}
    </a>
  )
}

/** Quiet "See all →" style link used beside section headings. */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-[0.8125rem] font-medium text-ink-500 transition-colors hover:text-ink-900"
    >
      {children}
    </Link>
  )
}
