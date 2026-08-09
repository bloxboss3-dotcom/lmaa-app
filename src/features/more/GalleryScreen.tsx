import { useState } from 'react'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { EmptyState, Skeleton } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import type { GalleryItem } from '@/domain/types'
import { useDocumentTitle } from '@/lib/hooks'

export function GalleryScreen() {
  const { bundle, loading } = useContent()
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  useDocumentTitle('Photo gallery')

  const items = [...bundle.gallery].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="Academy life"
        title="Photo gallery"
        description="Photos shared by the academy."
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Skeleton className="aspect-square" />
          <Skeleton className="aspect-square" />
          <Skeleton className="aspect-square" />
        </div>
      ) : items.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="block w-full overflow-hidden rounded-xl bg-ink-100"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title ?? ''}
                  className="aspect-square w-full object-cover transition-transform duration-200 hover:scale-[1.03]"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No photos yet"
          description="The academy has not added photos to the app. Only photos owned by LMAA, with permission from the families shown, should be published here."
        />
      )}

      <Dialog
        open={selected !== null}
        title={selected?.title ?? 'Photo'}
        onClose={() => setSelected(null)}
        className="sm:max-w-2xl"
      >
        {selected ? (
          <figure className="space-y-3">
            <img
              src={selected.imageUrl}
              alt={selected.title ?? ''}
              className="w-full rounded-xl object-contain"
            />
            {selected.caption ? (
              <figcaption className="text-sm text-ink-600">{selected.caption}</figcaption>
            ) : null}
            {selected.credit ? (
              <p className="text-xs text-ink-400">Photo: {selected.credit}</p>
            ) : null}
          </figure>
        ) : null}
      </Dialog>
    </Screen>
  )
}
