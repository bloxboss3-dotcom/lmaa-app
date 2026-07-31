import { cx } from '@/lib/cx'

export interface ChipOption<T extends string = string> {
  value: T
  label: string
  /** Optional count shown after the label, e.g. a filter result count. */
  count?: number
}

interface FilterChipsProps<T extends string> {
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Horizontally scrollable single-select filter row. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
              active
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cx('ml-1.5 text-xs', active ? 'text-white/70' : 'text-ink-400')}>
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

interface SegmentedControlProps<T extends string> {
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Two or three mutually exclusive views (Today / This week). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex rounded-xl bg-ink-100 p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'min-h-9 rounded-lg px-4 text-sm font-semibold transition-colors',
              active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
