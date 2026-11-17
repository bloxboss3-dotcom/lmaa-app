import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { features } from '@/config/features'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import {
  DemoFamilyService,
  FamilyError,
  type FamilyService,
  type FamilySession,
} from '@/data/family'
import { formatLongDate } from '@/domain/format'
import {
  PLAN_LABELS,
  STRIPES_TO_TEST,
  isBlackBeltClubCandidate,
  isNewStudent,
  isReadyToTest,
  isValidEmail,
  ladderPosition,
  nextRank,
  nextTestEvent,
  rankLabel,
  studentDisplayName,
  type Student,
} from '@/domain/students'
import type { AcademyEvent } from '@/domain/types'
import { useDocumentTitle } from '@/lib/hooks'
import { BeltChip } from './BeltChip'
import { useFamily } from './useFamily'

/**
 * My family: a parent signs in and sees their own child's belt, stripes and
 * class count. The only screen in the app that shows anything about a child,
 * and it shows it to that child's parent alone.
 */
export function FamilyScreen() {
  const { service, session, loading, setSession } = useFamily()
  useDocumentTitle('My family')

  if (!features.familyAccounts) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <PageIntro eyebrow="Families" title="My family" />
        <EmptyState
          title="Family sign-in is not available yet"
          description="The academy has not switched this on. Ask at the front desk about your child's belt and stripes."
          action={
            <LinkButton to="/" variant="secondary" size="sm">
              Back to Home
            </LinkButton>
          }
        />
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <PageIntro eyebrow="Families" title="My family" />
        <Skeleton className="h-40" />
      </Screen>
    )
  }

  if (!session) {
    return service.kind === 'demo' ? (
      <SampleIntro service={service} onStart={setSession} />
    ) : (
      <SignIn service={service} onSignedIn={setSession} />
    )
  }

  return <MyFamily service={service} session={session} onSignedOut={() => setSession(null)} />
}

/* ---------------------------------------------------------------- sign in */

function SampleIntro({
  service,
  onStart,
}: {
  service: FamilyService
  onStart: (session: FamilySession) => void
}) {
  const start = async () => {
    if (service instanceof DemoFamilyService) onStart(await service.startSample())
  }
  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro eyebrow="Families" title="My family" />
      <Card className="space-y-3">
        <p className="text-[0.95rem] leading-relaxed text-ink-800">
          Family sign-in is not switched on yet. Once the academy connects its records, a parent
          will sign in with a code sent to their email and see their own child&rsquo;s belt, stripes
          and class count here.
        </p>
        <p className="text-sm text-ink-500">
          You can look at a sample family now. The students in it are invented.
        </p>
        <Button variant="secondary" icon="eye" onClick={() => void start()}>
          See a sample family
        </Button>
      </Card>
    </Screen>
  )
}

function SignIn({
  service,
  onSignedIn,
}: {
  service: FamilyService
  onSignedIn: (session: FamilySession) => void
}) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fail = (cause: unknown, fallback: string) =>
    setError(cause instanceof FamilyError ? cause.message : fallback)

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!isValidEmail(email)) {
      setError('Enter the email address you gave the academy.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await service.requestCode(email)
      setCode('')
      setStep('code')
    } catch (cause) {
      fail(cause, 'We could not send a code just now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6,10}$/.test(code.trim())) {
      setError('Enter the code from the email. It is all numbers.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await service.verifyCode(email, code))
    } catch (cause) {
      fail(cause, 'That code did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="Families"
        title="My family"
        description="See your child's belt, stripes and classes. Only you and the academy can see them."
      />
      {step === 'email' ? (
        <form onSubmit={(event) => void sendCode(event)} noValidate>
          <Card className="space-y-4">
            <TextField
              label="Your email address"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError(null)
              }}
              error={error ?? undefined}
              hint="Use the email you gave the academy. We send a sign-in code to it, so there is no password to remember."
            />
            <Button type="submit" icon="mail" disabled={busy} fullWidth>
              {busy ? 'Sending…' : 'Email me a sign-in code'}
            </Button>
          </Card>
        </form>
      ) : (
        <form onSubmit={(event) => void verify(event)} noValidate>
          <Card className="space-y-4">
            <p className="text-[0.95rem] leading-relaxed text-ink-800">
              We sent a code to{' '}
              <strong className="font-semibold break-words">{email.trim()}</strong>. It can take a
              minute to arrive.
            </p>
            <TextField
              label="Sign-in code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              required
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ''))
                setError(null)
              }}
              error={error ?? undefined}
            />
            <Button type="submit" icon="check" disabled={busy} fullWidth>
              {busy ? 'Checking…' : 'Sign in'}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void sendCode()}>
                Send a new code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setStep('email')
                  setError(null)
                }}
              >
                Use a different email
              </Button>
            </div>
          </Card>
        </form>
      )}
      <p className="px-1 text-xs leading-relaxed text-ink-500">
        The academy links your email to your child at the front desk. Signing in shows nothing until
        that has been done.{' '}
        <Link to="/more/privacy" className="underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
    </Screen>
  )
}

/* -------------------------------------------------------------- my family */

function MyFamily({
  service,
  session,
  onSignedOut,
}: {
  service: FamilyService
  session: FamilySession
  onSignedOut: () => void
}) {
  const { bundle } = useContent()
  const [students, setStudents] = useState<Student[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    service
      .listMyStudents()
      .then((list) => {
        if (!active) return
        setStudents(list)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(
          cause instanceof FamilyError
            ? cause.message
            : 'Could not load your family. Please try again.',
        )
      })
    return () => {
      active = false
    }
  }, [service, session.email, attempt])

  const signOut = async () => {
    await service.signOut()
    onSignedOut()
  }

  const testEvent = nextTestEvent(bundle.events)
  const hasNewStudent = students?.some(isNewStudent) ?? false
  const hasPage = (slug: string) => bundle.pages.some((page) => page.slug === slug)

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="Families"
        title="My family"
        description={session.isDemo ? undefined : `Signed in as ${session.email}`}
        action={
          <Button variant="ghost" size="sm" icon="logout" onClick={() => void signOut()}>
            {session.isDemo ? 'Close sample' : 'Sign out'}
          </Button>
        }
      />

      {session.isDemo ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          <p>
            <strong className="font-semibold">Sample family.</strong> These students are invented to
            show what a parent will see. Nobody&rsquo;s real information is here.
          </p>
        </div>
      ) : null}

      {error ? (
        <EmptyState
          title="Could not load your family"
          description={error}
          action={
            <Button variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          }
        />
      ) : students === null ? (
        <Skeleton className="h-48" />
      ) : students.length === 0 ? (
        <EmptyState
          title="No student is linked to this email yet"
          description={`Ask at the front desk to add ${session.email} to your child's record. To keep every family's information private, only the academy can make that link.`}
          action={
            <LinkButton to="/more/message" variant="secondary" size="sm" icon="mail">
              Message the academy
            </LinkButton>
          }
        />
      ) : (
        <>
          {hasNewStudent && hasPage('new-families') ? (
            <Link
              to="/more/page/new-families"
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-crimson-100 bg-crimson-50 px-4 py-3 transition-colors hover:bg-crimson-100"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink-900">New to LMAA? Start here</span>
                <span className="block text-sm text-ink-600">
                  How class runs, belts, stripes and what a test looks like.
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="shrink-0 text-ink-400" />
            </Link>
          ) : null}

          <ul className="space-y-3">
            {students.map((student) => (
              <li key={student.id}>
                <StudentCard
                  student={student}
                  testEvent={testEvent}
                  showTestingGuide={hasPage('testing')}
                  showMemberships={hasPage('new-families')}
                />
              </li>
            ))}
          </ul>

          <p className="px-1 text-xs leading-relaxed text-ink-500">
            Belts, stripes and class counts are kept by the academy. If something looks wrong, tell
            the front desk.
          </p>
        </>
      )}
    </Screen>
  )
}

function StudentCard({
  student,
  testEvent,
  showTestingGuide,
  showMemberships,
}: {
  student: Student
  testEvent: AcademyEvent | undefined
  showTestingGuide: boolean
  showMemberships: boolean
}) {
  const position = ladderPosition(student.rank)
  const next = nextRank(student.rank)
  const ready = isReadyToTest(student)
  const stripesLeft = STRIPES_TO_TEST - student.stripes
  const tests = student.rank !== 'black'

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-1.5">
          <BeltChip rank={student.rank} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink-900">{studentDisplayName(student)}</h2>
          <p className="text-sm text-ink-600">
            {rankLabel(student.rank)} · belt {position.step} of {position.of}
          </p>
        </div>
        {student.isSample ? <SampleBadge /> : null}
      </div>

      {tests ? (
        <div className="rounded-xl bg-ink-50 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-semibold text-ink-800">Stripes</span>
            <span
              className="flex items-center gap-1.5"
              role="img"
              aria-label={`${student.stripes} of ${STRIPES_TO_TEST} stripes`}
            >
              {Array.from({ length: STRIPES_TO_TEST }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < student.stripes
                      ? 'h-3 w-6 rounded-sm bg-ink-900'
                      : 'h-3 w-6 rounded-sm bg-surface ring-1 ring-ink-300 ring-inset'
                  }
                />
              ))}
            </span>
            <span className="text-sm text-ink-600">
              {student.stripes} of {STRIPES_TO_TEST}
            </span>
            {ready ? (
              <Badge tone="success" icon="check" className="ml-auto">
                Ready to test
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-ink-600">
            {ready
              ? 'All 3 stripes earned. Make sure the blue, brown and red stripe forms are done too.'
              : `${stripesLeft} more ${stripesLeft === 1 ? 'stripe' : 'stripes'} to earn before testing.`}
          </p>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {next ? (
          <div>
            <dt className="text-ink-500">Next belt</dt>
            <dd className="font-semibold text-ink-900">{rankLabel(next)}</dd>
          </div>
        ) : null}
        {student.classesAttended !== undefined ? (
          <div>
            <dt className="text-ink-500">Classes attended</dt>
            <dd className="font-semibold text-ink-900">{student.classesAttended}</dd>
          </div>
        ) : null}
        {student.plan ? (
          <div>
            <dt className="text-ink-500">Membership</dt>
            <dd className="font-semibold text-ink-900">{PLAN_LABELS[student.plan]}</dd>
          </div>
        ) : null}
        {tests ? (
          <div>
            <dt className="text-ink-500">Next test</dt>
            <dd className="font-semibold text-ink-900">
              {testEvent ? (
                <Link to={`/events/${testEvent.id}`} className="underline underline-offset-2">
                  {formatLongDate(testEvent.startAt)}
                </Link>
              ) : (
                <span className="font-normal text-ink-600">Date to be announced</span>
              )}
            </dd>
          </div>
        ) : null}
      </dl>

      {isBlackBeltClubCandidate(student) && showMemberships ? (
        <p className="text-sm text-ink-600">
          The 1-year plan goes up to green belt. Black Belt Club carries on to black belt.{' '}
          <Link to="/more/page/new-families" className="font-medium underline underline-offset-2">
            About memberships
          </Link>
        </p>
      ) : null}

      {tests && showTestingGuide ? (
        <LinkButton to="/more/page/testing" variant="secondary" size="sm" iconRight="chevronRight">
          Getting ready for a belt test
        </LinkButton>
      ) : null}
    </Card>
  )
}
