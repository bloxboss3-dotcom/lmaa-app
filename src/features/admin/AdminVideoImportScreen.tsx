import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRepository } from '@/app/context'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextArea, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { LEVEL_SUGGESTIONS } from '@/domain/curriculum'
import { RESOURCE_COLLECTIONS, type ResourceCollection } from '@/domain/types'
import { parseVideoUrl } from '@/lib/video'
import { fetchVideoInfo } from '@/lib/videoInfo'
import { useDocumentTitle } from '@/lib/hooks'
import { useAdminContent } from './adminContext'
import { RESOURCE_COLLECTION_LABELS } from './collections'

interface Row {
  url: string
  title: string
  thumbnailUrl?: string
  status: 'ok' | 'not-playable' | 'duplicate'
}

/** `link | title` on each line; the title is optional. */
function parseLines(text: string): { url: string; title: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...rest] = line.split('|')
      return { url: url.trim(), title: rest.join('|').trim() }
    })
}

/**
 * Add a whole batch of videos at once — paste the links, the titles are
 * fetched, set the level once, done. Built for the day the academy's YouTube
 * channel arrives with thirty forms on it.
 */
export function AdminVideoImportScreen() {
  const { bundle, refresh } = useAdminContent()
  const { repository } = useRepository()
  const { notify } = useToast()
  const navigate = useNavigate()
  useDocumentTitle('Add several videos')

  const [collection, setCollection] = useState<ResourceCollection>('curriculum')
  const [program, setProgram] = useState('')
  const [level, setLevel] = useState('')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)

  const existingUrls = new Set(bundle.resources.map((item) => item.videoUrl).filter(Boolean))

  const check = async () => {
    const lines = parseLines(text)
    if (!lines.length) {
      notify('Paste at least one link first.', 'error')
      return
    }
    setBusy(true)
    const found: Row[] = []
    for (const line of lines) {
      const embed = parseVideoUrl(line.url)
      if (!embed) {
        found.push({ url: line.url, title: line.title, status: 'not-playable' })
        continue
      }
      if (existingUrls.has(line.url)) {
        found.push({ url: line.url, title: line.title, status: 'duplicate' })
        continue
      }
      const info = line.title ? null : await fetchVideoInfo(line.url)
      found.push({
        url: line.url,
        title: line.title || info?.title || '',
        thumbnailUrl: info?.thumbnailUrl,
        status: 'ok',
      })
    }
    setRows(found)
    setBusy(false)
  }

  const ready = (rows ?? []).filter((row) => row.status === 'ok' && row.title.trim())

  const add = async () => {
    if (!ready.length) return
    setBusy(true)
    let order = Math.max(100, ...bundle.resources.map((item) => item.sortOrder)) + 10
    let added = 0
    try {
      for (const row of ready) {
        await repository.saveResource({
          title: row.title.trim(),
          type: 'video',
          collection,
          program: program.trim() || undefined,
          level: level.trim() || undefined,
          videoUrl: row.url,
          thumbnailUrl: row.thumbnailUrl,
          sortOrder: order,
          published: true,
        })
        order += 10
        added += 1
      }
      await refresh()
      notify(
        `Added ${added} ${added === 1 ? 'video' : 'videos'}. Families can watch them now.`,
        'success',
      )
      navigate('/admin/resources')
    } catch {
      await refresh()
      notify(
        added
          ? `${added} added, then saving stopped. Check the list and try the rest again.`
          : 'The videos could not be saved. Please try again.',
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Learning resources</p>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">
            Add several videos
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Paste YouTube or Vimeo links, one per line. Titles are fetched for you; add your own
            after a <code className="rounded bg-ink-100 px-1">|</code> if you prefer.
          </p>
        </div>
        <LinkButton to="/admin/resources" variant="ghost" icon="arrowLeft">
          Back
        </LinkButton>
      </div>

      <Card className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Section"
          value={collection}
          onChange={(event) => setCollection(event.target.value as ResourceCollection)}
          options={RESOURCE_COLLECTIONS.map((value) => ({
            value,
            label: RESOURCE_COLLECTION_LABELS[value],
          }))}
        />
        <TextField
          label="Program"
          value={program}
          onChange={(event) => setProgram(event.target.value)}
          list="import-programs"
          hint="Applied to every video in this batch. Optional."
        />
        <datalist id="import-programs">
          {bundle.programs.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
        <TextField
          label="Level"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          list="import-levels"
          hint="Families see videos grouped by this, in belt order."
        />
        <datalist id="import-levels">
          {LEVEL_SUGGESTIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <TextArea
          label="Links"
          className="sm:col-span-2"
          rows={8}
          placeholder={'https://youtu.be/…\nhttps://www.youtube.com/watch?v=… | Taegeuk 1'}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setRows(null)
          }}
        />
        <div className="sm:col-span-2">
          <Button icon="search" variant="secondary" disabled={busy} onClick={() => void check()}>
            {busy && !rows ? 'Checking…' : 'Check links'}
          </Button>
        </div>
      </Card>

      {rows ? (
        <Card padded={false}>
          <ul>
            {rows.map((row, index) => (
              <li
                key={`${row.url}-${index}`}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-ink-100' : ''}`}
              >
                {row.status === 'ok' ? (
                  <img
                    src={row.thumbnailUrl ?? parseVideoUrl(row.url)?.thumbnailUrl}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded-lg bg-ink-900 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                    <Icon name="alert" size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {row.status === 'ok' ? (
                    <TextField
                      label={`Title for video ${index + 1}`}
                      value={row.title}
                      onChange={(event) =>
                        setRows((current) =>
                          current
                            ? current.map((item, i) =>
                                i === index ? { ...item, title: event.target.value } : item,
                              )
                            : current,
                        )
                      }
                      error={row.title.trim() ? undefined : 'Give this video a title.'}
                    />
                  ) : (
                    <p className="text-sm text-ink-700">
                      {row.status === 'duplicate'
                        ? 'Already in the app — skipped.'
                        : 'Not a YouTube or Vimeo link — skipped.'}
                    </p>
                  )}
                  <p className="mt-1 truncate text-xs text-ink-400">{row.url}</p>
                </div>
                <Badge tone={row.status === 'ok' ? 'success' : 'muted'}>
                  {row.status === 'ok' ? 'Ready' : 'Skipped'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {rows ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button icon="plus" disabled={busy || !ready.length} onClick={() => void add()}>
            {busy ? 'Adding…' : `Add ${ready.length} ${ready.length === 1 ? 'video' : 'videos'}`}
          </Button>
          <span className="text-sm text-ink-500">
            Published straight away, in the order pasted.
          </span>
        </div>
      ) : null}
    </div>
  )
}
