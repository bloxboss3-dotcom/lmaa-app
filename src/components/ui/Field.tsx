import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cx } from '@/lib/cx'

/**
 * Form controls used by the admin area.
 *
 * Every control is label-linked, describes its own error with
 * `aria-describedby`, and is at least 44px tall so it works on a phone.
 */

const CONTROL =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink-900 ' +
  'placeholder:text-ink-300 transition-colors min-h-11 ' +
  'disabled:bg-ink-50 disabled:text-ink-400'

const CONTROL_OK = 'border-ink-200 focus:border-ink-400'
const CONTROL_ERROR = 'border-crimson-600 bg-crimson-50'

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor: string
  children: ReactNode
  className?: string
}

function FieldShell({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-800">
        {label}
        {required ? <span className="ml-1 text-crimson-700">*</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-crimson-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  hint?: string
  error?: string
  className?: string
}

export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  const id = useId()
  const controlId = rest.id ?? id
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      htmlFor={controlId}
      className={className}
    >
      <input
        {...rest}
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined}
        className={cx(CONTROL, error ? CONTROL_ERROR : CONTROL_OK)}
      />
    </FieldShell>
  )
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label: string
  hint?: string
  error?: string
  className?: string
}

export function TextArea({ label, hint, error, className, rows = 5, ...rest }: TextAreaProps) {
  const id = useId()
  const controlId = rest.id ?? id
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      htmlFor={controlId}
      className={className}
    >
      <textarea
        {...rest}
        rows={rows}
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined}
        className={cx(CONTROL, 'leading-relaxed', error ? CONTROL_ERROR : CONTROL_OK)}
      />
    </FieldShell>
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string
  hint?: string
  error?: string
  className?: string
  options: { value: string; label: string }[]
}

export function SelectField({
  label,
  hint,
  error,
  className,
  options,
  ...rest
}: SelectFieldProps) {
  const id = useId()
  const controlId = rest.id ?? id
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={rest.required}
      htmlFor={controlId}
      className={className}
    >
      <select
        {...rest}
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined}
        className={cx(CONTROL, 'appearance-none pr-9', error ? CONTROL_ERROR : CONTROL_OK)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239a9aa1' stroke-width='2' stroke-linecap='round'><path d='m5 9 7 7 7-7'/></svg>\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.1rem',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: string
  hint?: string
  className?: string
}

export function Checkbox({ label, hint, className, ...rest }: CheckboxProps) {
  const id = useId()
  const controlId = rest.id ?? id
  return (
    <label
      htmlFor={controlId}
      className={cx(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-surface px-3.5 py-3',
        'transition-colors hover:border-ink-300',
        className,
      )}
    >
      <input
        {...rest}
        id={controlId}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-crimson-600)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-500">{hint}</span> : null}
      </span>
    </label>
  )
}
