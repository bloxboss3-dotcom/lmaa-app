import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/app/context'
import { features } from '@/config/features'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { FamilyError, getFamilyService } from '@/data/family'
import {
  LITTLE_TIGER_RANKS,
  MAIN_RANKS,
  PLAN_LABELS,
  STRIPES_TO_TEST,
  STUDENT_PLANS,
  isReadyToTest,
  nextRank,
  parseEmailList,
  rankLabel,
  studentDisplayName,
  validateStudent,
  type StudentDraft,
  type StudentErrors,
  type StudentPlan,
  type StudentRank,
  type StudentRecord,
} from '@/domain/students'
import { useDocumentTitle } from '@/lib/hooks'
import { BeltChip } from '@/features/family/BeltChip'

/** What the form edits: the draft, with the fields a text box holds as text. */
interface FormState {
  id?: string
  firstName: string
  lastInitial: string
  rank: StudentRank
  stripes: string
  classesAttended: string
  plan: '' | StudentPlan
  emails: string
  active: boolean
}

const BLANK: FormState = {
  firstName: '',
  lastInitial: '',
  rank: 'white',
  stripes: '0',
  classesAttended: '',
  plan: '',
  emails: '',
  active: true,
}

function toForm(student: StudentRecord): FormState {
  return {
    id: student.id,
    firstName: student.firstName,
    lastInitial: student.lastInitial,
    rank: student.rank,
    stripes: String(student.stripes),
    classesAttended: student.classesAttended === undefined ? '' : String(student.classesAttended),
    plan: student.plan ?? '',
    emails: student.guardianEmails.join('\n'),
    active: student.active,
  }
}

function toDraft(form: FormState): StudentDraft {
  const classes = form.classesAttended.trim()
  return {
    id: form.id,
    firstName: form.firstName.trim(),
    lastInitial: form.lastInitial.trim().toUpperCase(),
    rank: form.rank,
    stripes: Number(form.stripes),
    classesAttended: classes === '' ? undefined : Number(classes),
    plan: form.plan === '' ? undefined : form.plan,
    guardianEmails: parseEmailList(form.emails),
    active: form.active,
  }
}

function draftOf(student: StudentRecord, patch: Partial<StudentDraft>): StudentDraft {
  const { updatedAt: _updatedAt, isSample: _isSample, ...draft } = student
  return { ...draft, ...patch }
}

const RANK_OPTIONS = [...LITTLE_TIGER_RANKS, ...MAIN_RANKS].map((rank) => ({
  value: rank,
  label: rankLabel(rank),
}))

/**
 * Students and the parents who may see them.
 *
 * Staff keep each student's belt and stripes here and link the parent emails
 * that may view them. Kept deliberately small: a first name, a last initial
 * and what is on the belt. This is not the academy's student file.
 */
export function AdminStudentsScreen() {
  const service = getFamilyService()
  const { session } = useAuth()
  const { notify } = useToast()
  const [students, setStudents] = useState<StudentRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<StudentErrors>({})
  const [busy, setBusy] = useState(false)
  useDocumentTitle('Students & families')

  const reload = useCallback(async () => {
    try {
      setError(null)
      setStudents(await service.listStudents())
    } catch (cause) {
      setError(cause instanceof FamilyError ? cause.message : 'Could not load the students.')
    }
  }, [service])

  useEffect(() => {
    void reload()
  }, [reload])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (students ?? []).filter(
      (student) => !needle || studentDisplayName(student).toLowerCase().includes(needle),
    )
  }, [students, query])

  const replace = (saved: StudentRecord) =>
    setStudents((current) => {
      const list = current ?? []
      return list.some((student) => student.id === saved.id)
        ? list.map((student) => (student.id === saved.id ? saved : student))
        : [...list, saved].sort((a, b) => a.firstName.localeCompare(b.firstName))
    })

  const save = async (draft: StudentDraft, done: string) => {
    setBusy(true)
    try {
      replace(await service.saveStudent(draft))
      notify(done, 'success')
      return true
    } catch (cause) {
      notify(cause instanceof FamilyError ? cause.message : 'Could not save this student.', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    const draft = toDraft(form)
    const found = validateStudent(draft)
    setErrors(found)
    if (Object.keys(found).length) return
    if (await save(draft, `${studentDisplayName(draft)} saved.`)) setForm(null)
  }

  const setStripes = (student: StudentRecord, stripes: number) =>
    void save(
      draftOf(student, { stripes }),
      `${studentDisplayName(student)}: ${stripes} of ${STRIPES_TO_TEST} stripes.`,
    )

  const promote = (student: StudentRecord) => {
    const next = nextRank(student.rank)
    if (!next) return
    void save(
      draftOf(student, { rank: next, stripes: 0 }),
      `${studentDisplayName(student)} is now a ${rankLabel(next).toLowerCase()}.`,
    )
  }

  const remove = async (student: StudentRecord) => {
    setBusy(true)
    try {
      await service.deleteStudent(student.id)
      setStudents((current) => (current ?? []).filter((item) => item.id !== student.id))
      setForm(null)
      notify(`${studentDisplayName(student)} removed.`, 'success')
    } catch (cause) {
      notify(
        cause instanceof FamilyError ? cause.message : 'Could not remove this student.',
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  if (!features.familyAccounts) {
    return (
      <EmptyState
        title="Family accounts are switched off"
        description="Students and parent sign-in appear here once family accounts are turned on for the app. See FAMILY_ACCOUNTS_SETUP.md."
      />
    )
  }

  const editing = form?.id ? students?.find((student) => student.id === form.id) : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Family accounts</p>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">
            Students &amp; families
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-500">
            Each student&rsquo;s belt and stripes, and the parent emails that may see them. A parent
            signs in with one of those emails and sees only their own child.
          </p>
        </div>
        {form ? null : (
          <Button
            icon="plus"
            onClick={() => {
              setErrors({})
              setForm(BLANK)
            }}
          >
            Add a student
          </Button>
        )}
      </div>

      {service.kind === 'demo' ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-100">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-gold-700" />
          <p>
            <strong className="font-semibold text-ink-900">Demo mode.</strong> These are invented
            sample students, saved in this browser only. Please do not type real students here:
            connect Supabase first, so their records are kept safely and parents can sign in.
          </p>
        </div>
      ) : null}

      {form ? (
        <form onSubmit={(event) => void submit(event)} noValidate>
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-ink-900">
              {editing ? `Edit ${studentDisplayName(editing)}` : 'Add a student'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <TextField
                label="First name"
                name="firstName"
                required
                maxLength={40}
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                error={errors.firstName}
              />
              <TextField
                label="Last initial"
                name="lastInitial"
                required
                maxLength={1}
                value={form.lastInitial}
                onChange={(event) => setForm({ ...form, lastInitial: event.target.value })}
                error={errors.lastInitial}
                hint="One letter only."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Belt"
                name="rank"
                options={RANK_OPTIONS}
                value={form.rank}
                onChange={(event) => setForm({ ...form, rank: event.target.value as StudentRank })}
                error={errors.rank}
              />
              <SelectField
                label="Stripes on the belt"
                name="stripes"
                options={[0, 1, 2, 3].map((count) => ({
                  value: String(count),
                  label: String(count),
                }))}
                value={form.stripes}
                onChange={(event) => setForm({ ...form, stripes: event.target.value })}
                error={errors.stripes}
              />
              <TextField
                label="Classes attended"
                name="classesAttended"
                inputMode="numeric"
                value={form.classesAttended}
                onChange={(event) =>
                  setForm({ ...form, classesAttended: event.target.value.replace(/\D/g, '') })
                }
                error={errors.classesAttended}
                hint="Optional. Leave empty if you do not count them."
              />
              <SelectField
                label="Membership"
                name="plan"
                options={[
                  { value: '', label: 'Not set' },
                  ...STUDENT_PLANS.map((plan) => ({ value: plan, label: PLAN_LABELS[plan] })),
                ]}
                value={form.plan}
                onChange={(event) =>
                  setForm({ ...form, plan: event.target.value as FormState['plan'] })
                }
              />
            </div>
            <TextArea
              label="Parent emails"
              name="emails"
              rows={3}
              value={form.emails}
              onChange={(event) => setForm({ ...form, emails: event.target.value })}
              error={errors.guardianEmails}
              hint="One per line. A parent who signs in with one of these sees this student, and nobody else's."
            />
            <Checkbox
              label="Currently training"
              hint="Untick when a student leaves. Their parents stop seeing them, and the record is kept."
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" icon="check" disabled={busy}>
                {busy ? 'Saving…' : 'Save student'}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setForm(null)}>
                Cancel
              </Button>
              {editing && session?.role === 'admin' ? (
                <Button
                  variant="ghost"
                  icon="trash"
                  disabled={busy}
                  className="ml-auto text-crimson-700"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${studentDisplayName(editing)} for good? Their parents will no longer see them.`,
                      )
                    )
                      void remove(editing)
                  }}
                >
                  Remove student
                </Button>
              ) : null}
            </div>
          </Card>
        </form>
      ) : null}

      {error ? (
        <EmptyState
          title="Could not load the students"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      ) : students === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add a student, set their belt, and link a parent's email so the parent can sign in."
        />
      ) : (
        <>
          <TextField
            label="Find a student"
            name="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="space-y-3">
            {visible.map((student) => (
              <li key={student.id}>
                <StudentRow
                  student={student}
                  busy={busy}
                  onStripes={(stripes) => setStripes(student, stripes)}
                  onPromote={() => promote(student)}
                  onEdit={() => {
                    setErrors({})
                    setForm(toForm(student))
                    window.scrollTo({ top: 0 })
                  }}
                />
              </li>
            ))}
          </ul>
          {visible.length === 0 ? (
            <p className="text-sm text-ink-500">No student matches &ldquo;{query}&rdquo;.</p>
          ) : null}
        </>
      )}
    </div>
  )
}

function StudentRow({
  student,
  busy,
  onStripes,
  onPromote,
  onEdit,
}: {
  student: StudentRecord
  busy: boolean
  onStripes: (stripes: number) => void
  onPromote: () => void
  onEdit: () => void
}) {
  const name = studentDisplayName(student)
  const ready = isReadyToTest(student)
  const next = nextRank(student.rank)
  const parents = student.guardianEmails.length

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <BeltChip rank={student.rank} width={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{name}</p>
          <p className="text-sm text-ink-500">
            {rankLabel(student.rank)} · {student.stripes} of {STRIPES_TO_TEST} stripes
            {student.classesAttended !== undefined ? ` · ${student.classesAttended} classes` : ''}
          </p>
        </div>
        {/* On a phone the badges take their own line, so they never squeeze the name. */}
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
          {student.isSample ? <SampleBadge /> : null}
          {!student.active ? <Badge tone="muted">Not training</Badge> : null}
          {ready ? (
            <Badge tone="success" icon="check">
              Ready to test
            </Badge>
          ) : null}
          <Badge tone={parents ? 'neutral' : 'warning'}>
            {parents
              ? `${parents} parent ${parents === 1 ? 'email' : 'emails'}`
              : 'No parent email'}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {student.rank !== 'black' && student.stripes < STRIPES_TO_TEST ? (
          <Button
            size="sm"
            icon="plus"
            disabled={busy}
            aria-label={`Add a stripe for ${name}`}
            onClick={() => onStripes(student.stripes + 1)}
          >
            Stripe
          </Button>
        ) : null}
        {student.stripes > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            aria-label={`Take a stripe off ${name}`}
            onClick={() => onStripes(student.stripes - 1)}
          >
            Undo stripe
          </Button>
        ) : null}
        {ready && next ? (
          <Button
            size="sm"
            variant="secondary"
            icon="medal"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`${name} passed the test and moves up to ${rankLabel(next)}?`))
                onPromote()
            }}
          >
            Passed: move to {rankLabel(next)}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          icon="pencil"
          className="ml-auto"
          aria-label={`Edit ${name}`}
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>
    </Card>
  )
}
