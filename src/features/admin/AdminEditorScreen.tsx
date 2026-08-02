import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useNotifications, useRepository } from '@/app/context'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, EmptyState } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/ui/Icon'
import { RichText } from '@/components/ui/RichText'
import { useToast } from '@/components/ui/toastContext'
import { useAdminContent } from './adminContext'
import { findCollection, type AdminRecord } from './collections'
import { FormFields } from './FormFields'
import { hasErrors, validateValues, type FormValues, type ValidationErrors } from './validation'

/** Create/edit screen shared by every content type. */
export function AdminEditorScreen() {
  const { collection: key, id } = useParams<{ collection: string; id: string }>()
  const collection = findCollection(key)
  const { bundle, refresh } = useAdminContent()
  const { repository } = useRepository()
  const notifications = useNotifications()
  const { notify } = useToast()
  const navigate = useNavigate()

  const isNew = id === 'new'
  const existing = useMemo(
    () => (collection && !isNew ? collection.list(bundle).find((item) => item.id === id) : undefined),
    [collection, bundle, id, isNew],
  )

  const context = useMemo(() => ({ programs: bundle.programs }), [bundle.programs])
  const fields = useMemo(() => collection?.fields(context) ?? [], [collection, context])

  const [values, setValues] = useState<FormValues>(() => {
    if (!collection) return {}
    return existing ? collection.toValues(existing) : collection.defaults(context)
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [sendPush, setSendPush] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [dirty, setDirty] = useState(false)

  if (!collection) return <Navigate to="/admin" replace />
  if (!isNew && !existing) {
    return (
      <EmptyState
        title="That item no longer exists"
        description="It may have been deleted by someone else."
        action={
          <LinkButton to={`/admin/${collection.key}`} variant="secondary" size="sm">
            Back to {collection.title.toLowerCase()}
          </LinkButton>
        }
      />
    )
  }

  const update = (name: string, value: string | number | boolean) => {
    setDirty(true)
    setValues((current) => ({ ...current, [name]: value }))
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
    }
  }

  const save = async (event: FormEvent, publishOverride?: boolean) => {
    event.preventDefault()
    const nextValues =
      publishOverride === undefined ? values : { ...values, published: publishOverride }
    const found = validateValues(fields, nextValues)
    setErrors(found)
    if (hasErrors(found)) {
      notify('Please check the highlighted fields.', 'error')
      return
    }

    setBusy(true)
    try {
      const draft = collection.toDraft(nextValues, existing as AdminRecord | undefined)
      await collection.save(repository, draft)
      await refresh()
      setDirty(false)

      if (sendPush && collection.supportsPush) {
        // Never claim a notification was sent: ask the provider and report back.
        const result = await notifications.send({
          title: String(nextValues.title ?? 'LMAA update'),
          message: String(nextValues.body ?? '').slice(0, 140),
        })
        notify(
          result.sent ? 'Saved and notification sent.' : `Saved. ${result.reason}`,
          result.sent ? 'success' : 'info',
        )
      } else {
        notify(
          nextValues.published
            ? `Saved. Families can see this ${collection.singular} now.`
            : `Saved as a draft. Families cannot see it yet.`,
          'success',
        )
      }
      navigate(`/admin/${collection.key}`)
    } catch (error) {
      console.error(error)
      notify(`That ${collection.singular} could not be saved. Please try again.`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    if (dirty) setConfirmLeave(true)
    else navigate(`/admin/${collection.key}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {collection.title}
          </p>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">
            {isNew ? `New ${collection.singular}` : `Edit ${collection.singular}`}
          </h1>
        </div>
        <div className="flex gap-2">
          {existing && !existing.published ? <Badge tone="neutral">Draft</Badge> : null}
          <Button variant="ghost" icon="arrowLeft" onClick={leave}>
            Back
          </Button>
        </div>
      </div>

      <form onSubmit={(event) => void save(event)} className="space-y-5" noValidate>
        <Card>
          <FormFields fields={fields} values={values} errors={errors} onChange={update} />
        </Card>

        {collection.supportsPush ? (
          <Card className={notifications.canSend ? undefined : 'bg-ink-50'}>
            <Checkbox
              label="Also send a push notification"
              hint={
                notifications.canSend
                  ? 'Families who have turned on notifications will be alerted.'
                  : 'Push notifications are not connected yet, so nothing will be sent. The update will still be published in the app.'
              }
              checked={sendPush}
              disabled={!notifications.canSend}
              onChange={(event) => setSendPush(event.target.checked)}
            />
            {!notifications.canSend ? (
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
                <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                To switch this on, deploy the secure notification function described in
                SUPABASE_SETUP.md. The provider secret must never be added to the app itself.
              </p>
            ) : null}
          </Card>
        ) : null}

        {preview ? (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-ink-900">
              How families will see this
            </h2>
            <div className="rounded-xl bg-canvas p-4">
              <h3 className="text-lg font-semibold text-ink-900">
                {String(values.title ?? values.question ?? values.name ?? values.className ?? '')}
              </h3>
              <RichText
                text={String(values.body ?? values.answer ?? values.description ?? values.summary ?? '')}
                className="mt-2"
              />
            </div>
          </Card>
        ) : null}

        <div className="sticky bottom-0 -mx-3 flex flex-wrap gap-2 border-t border-ink-100 bg-canvas/95 px-3 py-3 backdrop-blur md:-mx-6 md:px-6">
          <Button type="submit" icon="check" disabled={busy}>
            {busy ? 'Saving…' : values.published ? 'Save & publish' : 'Save'}
          </Button>
          {values.published ? (
            <Button
              type="button"
              variant="secondary"
              icon="pencil"
              disabled={busy}
              onClick={(event) => void save(event, false)}
            >
              Save as draft
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              icon="eye"
              disabled={busy}
              onClick={(event) => void save(event, true)}
            >
              Publish now
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            icon={preview ? 'eyeOff' : 'eye'}
            onClick={() => setPreview((open) => !open)}
          >
            {preview ? 'Hide preview' : 'Preview'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmLeave}
        title="Leave without saving?"
        description="Your changes to this item will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        onConfirm={() => navigate(`/admin/${collection.key}`)}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  )
}
