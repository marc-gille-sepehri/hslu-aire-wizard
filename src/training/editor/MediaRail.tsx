import { type DragEvent, useCallback, useEffect, useState } from 'react'

import { labels } from '../labels'
import { type MediaAsset, blobUrl, listAssets } from '../admin/mediaApi'
import { useModuleEditor } from './ModuleEditorContext'

const t = labels.editor.mediaRail

/** The payload a drop reads. `text/plain` doubles as the Markdown fallback. */
export const MEDIA_MIME = 'application/x-aire-media'

export function markdownFor(asset: MediaAsset): string {
  const alt = (asset.descriptors?.altText ?? '').replace(/[[\]]/g, '')
  return `![${alt}](${blobUrl(asset.blobKeys?.web ?? asset.blobKeys?.original ?? '')})`
}

/**
 * Fly-out rail of extracted figures, mirroring the block palette on the other
 * side. Drag one onto an insertion zone to add it as a media block, or into a
 * Markdown editor to place an image at the cursor.
 *
 * Collapsed to a tab by default: unlike the block palette, whose entries are
 * short labels, this list is thumbnails and needs real width — and an author
 * writing prose should not have that pushed at them until they want it.
 */
export default function MediaRail() {
  const { setDragState } = useModuleEditor()
  const [open, setOpen] = useState(false)
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const { assets: rows } = await listAssets({ q: q.trim() || undefined, limit: 60 })
      setAssets(rows)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Only fetch once the rail is actually opened — an author who never uses it
  // should not pay for the list on every module they edit.
  useEffect(() => {
    if (open && assets.length === 0 && !loading) void load('')
  }, [open, assets.length, loading, load])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const onDragStart = (e: DragEvent, asset: MediaAsset) => {
    const url = blobUrl(asset.blobKeys?.web ?? asset.blobKeys?.original ?? '')
    e.dataTransfer.effectAllowed = 'copy'
    // Markdown as text/plain so a drop into any textarea does something sensible
    // even where nothing knows about this rail.
    e.dataTransfer.setData('text/plain', markdownFor(asset))
    e.dataTransfer.setData(MEDIA_MIME, JSON.stringify({ assetId: asset.assetId, url }))
    setDragState({
      kind: 'media',
      url,
      altText: asset.descriptors?.altText ?? '',
      filename: asset.provenance?.sourceDoc ?? 'Abbildung',
      bytes: asset.bytes ?? 0,
    })
  }

  return (
    <aside className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <div className="flex items-stretch">
        {open && (
          <div className="max-h-[70vh] w-72 overflow-y-auto rounded-r-xl border border-l-0 border-mist bg-white/95 p-3 shadow-lg backdrop-blur">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-kicker text-gold">
              {t.title}
            </p>
            <p className="mb-2 px-1 text-xs leading-snug text-slate-500">{t.hint}</p>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load(query)}
              placeholder={t.search}
              className="mb-2 w-full rounded-md border border-mist bg-white px-2 py-1.5 text-xs outline-none focus:border-navy"
            />

            {error && <p className="px-1 text-xs text-red-700">{error}</p>}
            {loading && <p className="px-1 text-xs text-slate-400">{labels.loading}</p>}
            {!loading && assets.length === 0 && !error && (
              <p className="px-1 text-xs text-slate-400">{t.empty}</p>
            )}

            <ul className="list-none m-0 p-0 space-y-1.5">
              {assets.map((a) => (
                <li key={a.assetId}>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, a)}
                    onDragEnd={() => setDragState(null)}
                    title={a.descriptors?.altText ?? ''}
                    className="flex cursor-grab items-center gap-2 rounded-md border border-mist bg-cream p-1.5 transition-colors hover:border-navy hover:bg-white active:cursor-grabbing"
                  >
                    <img
                      src={blobUrl(a.blobKeys?.thumb ?? a.blobKeys?.original ?? '')}
                      alt=""
                      loading="lazy"
                      className="h-10 w-14 shrink-0 rounded border border-mist bg-white object-contain"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-navy">
                      {a.descriptors?.altText ?? '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={open ? t.close : t.open}
          aria-label={open ? t.close : t.open}
          aria-expanded={open}
          className="flex w-7 items-center justify-center rounded-r-xl border border-l-0 border-mist bg-white/95 py-4 text-navy shadow-lg backdrop-blur hover:bg-cream"
        >
          <span className="text-xs [writing-mode:vertical-rl]">{t.title}</span>
        </button>
      </div>
    </aside>
  )
}
