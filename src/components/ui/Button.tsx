import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-crimson-600 text-white hover:bg-crimson-700 active:bg-crimson-800 shadow-[0_6px_18px_-8px_rgba(193,18,31,0.8)]',
  secondary: 'bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100',
  danger: 'bg-white text-crimson-700 border border-crimson-200 hover:bg-crimson-50',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
}

const SIZES: Record<ButtonSize, string> = {
  // Minimum 44px tall targets — comfortable for thumbs and accessible.
  sm: 'min-h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'min-h-11 px-4 text-[0.95rem] gap-2 rounded-xl',
  lg: 'min-h-13 px-5 text-base gap-2.5 rounded-xl',
}

const BASE =
  'inline-flex items-center justify-center font-semibold transition-colors duration-150 ' +
  'disabled:opacity-45 disabled:cursor-not-allowed select-none'

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
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  )
}

interface LinkButtonProps extends CommonProps {
  to: string
  'aria-label'?: string
}

/** In-app navigation styled as a button. */
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
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </Link>
  )
}

interface ExternalButtonProps extends CommonProps {
  href?: string
  /** Shown (and announced) when the action has nothing to link to yet. */
  disabledReason?: string
  target?: string
}

/**
 * A link out of the app (tel:, mailto:, maps, registration pages).
 *
 * When the academy has not supplied the detail yet, this renders a disabled
 * control with an honest explanation instead of a dead link.
 */
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
        {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
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
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </a>
  )
}
