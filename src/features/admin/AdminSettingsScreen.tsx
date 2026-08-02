import { useEffect, useState, type FormEvent } from 'react'
import { useAuth, useRepository } from '@/app/context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextArea, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import type { AcademySettings } from '@/domain/types'
import { useAdminContent } from './adminContext'
import { hasErrors, validateValues, type FieldDef, type FormValues } from './validation'

const FIELDS: FieldDef[] = [
  { name: 'academyName', label: 'Academy name', type: 'text', required: true },
  { name: 'tagline', label: 'Tagline', type: 'text', hint: 'One short line shown on the home screen.' },
  { name: 'phone', label: 'Phone number', type: 'text', hint: 'Families tap this to call.' },
  { name: 'email', label: 'Email address', type: 'text' },
  { name: 'mapUrl', label: 'Map link', type: 'url', hint: 'A Google Maps or Apple Maps link.' },
  { name: 'websiteUrl', label: 'Website', type: 'url' },
  { name: 'supportEmail', label: 'Support email', type: 'text', hint: 'Where app problems should be reported.' },
  { name: 'officeHours', label: 'Office hours', type: 'text' },
  { name: 'facebook', label: 'Facebook link', type: 'url' },
  { name: 'instagram', label: 'Instagram link', type: 'url' },
  { name: 'youtube', label: 'YouTube link', type: 'url' },
  { name: 'tiktok', label: 'TikTok link', type: 'url' },
]

function toValues(settings: AcademySettings): FormValues {
  return {
    academyName: settings.academyName,
    tagline: settings.tagline ?? '',
    description: settings.description ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    address: settings.addressLines.join('\n'),
    mapUrl: settings.mapUrl ?? '',
    websiteUrl: settings.websiteUrl ?? '',
    supportEmail: settings.supportEmail ?? '',
    officeHours: settings.officeHours ?? '',
    facebook: settings.social.facebook ?? '',
    instagram: settings.social.instagram ?? '',
    youtube: settings.social.youtube ?? '',
    tiktok: settings.social.tiktok ?? '',
  }
}

const text = (value: FormValues[string]): string => String(value ?? '').trim()
const optional = (value: FormValues[string]): string | undefined => text(value) || undefined

export function AdminSettingsScreen() {
  const { bundle, refresh } = useAdminContent()
  const { repository } = useRepository()
  const { session } = useAuth()
  const { notify } = useToast()
  const [values, setValues] = useState<FormValues>(() => toValues(bundle.settings))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Keep the form in step with content that loads after first paint.
  useEffect(() => {
    setValues(toValues(bundle.settings))
  }, [bundle.settings])

  const readOnly = session?.role !== 'admin'

  const update = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }))

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateValues(FIELDS, values)
    setErrors(found)
    if (hasErrors(found)) {
      notify('Please check the highlighted fields.', 'error')
      return
    }
    setBusy(true)
    try {
      const next: AcademySettings = {
        academyName: text(values.academyName),
        tagline: optional(values.tagline),
        description: optional(values.description),
        phone: optional(values.phone),
        email: optional(values.email),
        addressLines: text(values.address)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        mapUrl: optional(values.mapUrl),
        websiteUrl: optional(values.websiteUrl),
        supportEmail: optional(values.supportEmail),
        officeHours: optional(values.officeHours),
        social: {
          facebook: optional(values.facebook),
          instagram: optional(values.instagram),
          youtube: optional(values.youtube),
          tiktok: optional(values.tiktok),
        },
        updatedAt: new Date().toISOString(),
      }
      await repository.updateSettings(next)
      await refresh()
      notify('Academy information saved.', 'success')
    } catch (error) {
      console.error(error)
      notify('The academy information could not be saved. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">Academy information</h1>
        <p className="mt-1 text-sm text-ink-500">
          These details power the Contact screen, the Call and Directions buttons, and the app
          footer.
        </p>
      </div>

      {readOnly ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-700">
          <Icon name="lock" size={18} className="mt-0.5 shrink-0" />
          <p>
            Editors can manage content but not academy information. Ask an administrator to make
            changes here.
          </p>
        </div>
      ) : null}

      <form onSubmit={(event) => void save(event)} className="space-y-5" noValidate>
        <Card className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              hint={field.hint}
              error={errors[field.name]}
              required={field.required}
              disabled={readOnly}
              type={field.type === 'url' ? 'url' : 'text'}
              value={String(values[field.name] ?? '')}
              onChange={(event) => update(field.name, event.target.value)}
            />
          ))}

          <TextArea
            label="Street address"
            hint="One line per row, exactly as it should appear."
            rows={3}
            disabled={readOnly}
            className="sm:col-span-2"
            value={String(values.address ?? '')}
            onChange={(event) => update('address', event.target.value)}
          />

          <TextArea
            label="About the academy"
            hint="A short paragraph shown on the About screen."
            rows={5}
            disabled={readOnly}
            className="sm:col-span-2"
            value={String(values.description ?? '')}
            onChange={(event) => update('description', event.target.value)}
          />
        </Card>

        {!readOnly ? (
          <Button type="submit" icon="check" disabled={busy}>
            {busy ? 'Saving…' : 'Save academy information'}
          </Button>
        ) : null}
      </form>

      <Card className="bg-ink-50">
        <h2 className="font-semibold text-ink-900">Staff access</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          Staff accounts are created by the academy owner in the Supabase dashboard — the app has no
          public sign-up on purpose. Full instructions are in SUPABASE_SETUP.md.
        </p>
        <SelectField
          className="mt-3 max-w-xs"
          label="Your role"
          disabled
          options={[
            { value: 'admin', label: 'Administrator — full access' },
            { value: 'editor', label: 'Editor — content only' },
          ]}
          value={session?.role ?? 'editor'}
        />
      </Card>
    </div>
  )
}
