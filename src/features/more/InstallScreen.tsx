import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useDocumentTitle } from '@/lib/hooks'
import { useInstallPrompt } from '@/pwa/usePwa'

const IPHONE_STEPS = [
  'Open this app in Safari (it must be Safari on iPhone or iPad).',
  'Tap the Share button — the square with an arrow pointing up.',
  'Scroll down and tap “Add to Home Screen”.',
  'Tap “Add”. The LMAA icon will appear with your other apps.',
]

const ANDROID_STEPS = [
  'Open this app in Chrome.',
  'Tap the ⋮ menu in the top right.',
  'Tap “Add to Home screen” or “Install app”.',
  'Confirm. The LMAA icon will appear with your other apps.',
]

const DESKTOP_STEPS = [
  'Open this app in Chrome or Edge.',
  'Look for the install icon in the address bar, or open the ⋮ menu.',
  'Choose “Install”.',
]

export function InstallScreen() {
  const install = useInstallPrompt()
  useDocumentTitle('Install the app')

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="This app"
        title="Install the app"
        description="Add LMAA to your home screen so it opens instantly, like any other app."
      />

      {install.isInstalled ? (
        <Card className="flex items-center gap-3 border-emerald-500/25 bg-emerald-500/10">
          <Icon name="check" size={22} className="shrink-0 text-emerald-300" />
          <p className="font-semibold text-emerald-200">
            The app is already installed on this device.
          </p>
        </Card>
      ) : install.canPrompt ? (
        <Card className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 font-semibold text-ink-800">
            Your browser can install the app for you.
          </p>
          <Button icon="download" onClick={() => void install.promptInstall()}>
            Install now
          </Button>
        </Card>
      ) : null}

      <Steps title="iPhone & iPad" icon="download" steps={IPHONE_STEPS} highlight={install.isIos} />
      <Steps title="Android" icon="download" steps={ANDROID_STEPS} />
      <Steps title="Computer" icon="download" steps={DESKTOP_STEPS} />

      <Card className="bg-ink-50">
        <h2 className="font-semibold text-ink-900">If you do not see the option</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          Some browsers do not support installing web apps. The app still works normally in your
          browser — you can bookmark this page instead. On iPhone, installing only works in Safari.
        </p>
      </Card>
    </Screen>
  )
}

function Steps({
  title,
  steps,
  highlight,
}: {
  title: string
  icon: 'download'
  steps: string[]
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-crimson-600/40 ring-1 ring-crimson-600/20' : undefined}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-ink-900">{title}</h2>
        {highlight ? <Badge tone="red">Your device</Badge> : null}
      </div>
      <ol className="space-y-2.5">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crimson-600 text-xs font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </Card>
  )
}
