import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/Field'
import { cx } from '@/lib/cx'
import type { FieldDef, FormValues, ValidationErrors } from './validation'

interface FormFieldsProps {
  fields: FieldDef[]
  values: FormValues
  errors: ValidationErrors
  onChange: (name: string, value: string | number | boolean) => void
  className?: string
}

/**
 * Renders a whole admin form from field definitions.
 *
 * One renderer means every screen gets the same labels, hints, error styling
 * and touch targets for free — and adding a field is a one-line change.
 */
export function FormFields({ fields, values, errors, onChange, className }: FormFieldsProps) {
  return (
    <div className={cx('grid gap-4 sm:grid-cols-2', className)}>
      {fields.map((field) => {
        if (field.visibleWhen && !field.visibleWhen(values)) return null
        const value = values[field.name]
        const error = errors[field.name]
        const wide = field.wide || field.type === 'textarea'

        const common = {
          label: field.label,
          hint: field.hint,
          error,
          required: field.required,
          className: cx(wide && 'sm:col-span-2'),
        }

        switch (field.type) {
          case 'textarea':
            return (
              <TextArea
                key={field.name}
                {...common}
                rows={field.rows ?? 6}
                placeholder={field.placeholder}
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          case 'select':
            return (
              <SelectField
                key={field.name}
                {...common}
                options={field.options ?? []}
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          case 'checkbox':
            return (
              <div key={field.name} className={cx(wide && 'sm:col-span-2')}>
                <Checkbox
                  label={field.label}
                  hint={field.hint}
                  checked={Boolean(value)}
                  onChange={(event) => onChange(field.name, event.target.checked)}
                />
              </div>
            )
          case 'number':
            return (
              <TextField
                key={field.name}
                {...common}
                type="number"
                inputMode="numeric"
                value={value === undefined || value === '' ? '' : String(value)}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          case 'datetime':
            return (
              <TextField
                key={field.name}
                {...common}
                type="datetime-local"
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          case 'date':
            return (
              <TextField
                key={field.name}
                {...common}
                type="date"
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          case 'time':
            return (
              <TextField
                key={field.name}
                {...common}
                type="time"
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          case 'url':
            return (
              <TextField
                key={field.name}
                {...common}
                type="url"
                inputMode="url"
                placeholder={field.placeholder ?? 'https://'}
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
          default:
            return (
              <TextField
                key={field.name}
                {...common}
                type="text"
                placeholder={field.placeholder}
                value={String(value ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )
        }
      })}
    </div>
  )
}
