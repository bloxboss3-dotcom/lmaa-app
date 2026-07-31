import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { ExternalButton } from '@/components/ui/Button'
import { Card, EmptyState } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { mailtoHref, telHref } from '@/domain/format'
import { useDocumentTitle } from '@/lib/hooks'

/**
 * Contact details come from editable settings — nothing is hard-coded.
 * Anything the academy has not supplied yet is shown as a clear, honest
 * "not added yet" line rather than a broken link.
 */
export function ContactScreen() {
  const { bundle } = useContent()
  const { settings } = bundle
  useDocumentTitle('Contact')

  const address = settings.addressLines.filter(Boolean)
  const social = Object.entries(settings.social).filter(([, url]) => Boolean(url)) as [
    string,
    string,
  ][]
  const hasAnything =
    settings.phone || settings.email || address.length || settings.websiteUrl || social.length

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="Get in touch"
        title="Contact the academy"
        description="The fastest way to reach Lee's Martial Arts Academy."
      />

      {hasAnything ? (
        <>
          <Card className="space-y-4">
            <InfoRow icon="phone" label="Phone" value={settings.phone} />
            <InfoRow icon="mail" label="Email" value={settings.email} />
            <InfoRow
              icon="pin"
              label="Address"
              value={address.length ? address.join('\n') : undefined}
            />
            <InfoRow icon="clock" label="Office hours" value={settings.officeHours} />
            <InfoRow icon="globe" label="Website" value={settings.websiteUrl} />
          </Card>

          <div className="flex flex-wrap gap-2">
            <ExternalButton
              href={telHref(settings.phone)}
              icon="phone"
              variant="primary"
              disabledReason="The phone number has not been added yet"
            >
              Call the academy
            </ExternalButton>
            <ExternalButton
              href={mailtoHref(settings.email)}
              icon="mail"
              disabledReason="The email address has not been added yet"
            >
              Send an email
            </ExternalButton>
            <ExternalButton
              href={settings.mapUrl}
              icon="pin"
              disabledReason="The map link has not been added yet"
            >
              Directions
            </ExternalButton>
            <ExternalButton
              href={settings.websiteUrl}
              icon="globe"
              disabledReason="The website address has not been added yet"
            >
              Visit the website
            </ExternalButton>
          </div>

          {social.length ? (
            <section>
              <h2 className="mb-2 text-[0.68rem] font-bold tracking-[0.16em] text-ink-400 uppercase">
                Follow the academy
              </h2>
              <div className="flex flex-wrap gap-2">
                {social.map(([name, url]) => (
                  <ExternalButton key={name} href={url} icon="external" size="sm">
                    {name[0].toUpperCase() + name.slice(1)}
                  </ExternalButton>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="phone"
          title="Contact details are coming soon"
          description="The academy has not added its phone number, email or address to the app yet. Please ask at the front desk in the meantime."
        />
      )}
    </Screen>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName
  label: string
  value?: string
}) {
  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold tracking-[0.14em] text-ink-400 uppercase">{label}</p>
        {value ? (
          <p className="text-[0.95rem] leading-relaxed font-medium whitespace-pre-line text-ink-800">
            {value}
          </p>
        ) : (
          <p className="text-sm text-ink-400 italic">Not added yet</p>
        )}
      </div>
    </div>
  )
}
