import { useCallback, useEffect, useRef, useState } from 'react'

import { labels } from '../labels'
import {
  ACTIVE_STATES,
  type MediaAsset,
  type MediaJob,
  blobUrl,
  formatBytes,
  formatDate,
  listAssets,
  listJobs,
  retireAsset,
  retireBySource,
  retireMany,
  startIngest,
} from './mediaApi'

const t = labels.adminMedia

const ACCEPTED = ['.pptx', '.pptm', '.pdf']
const POLL_MS = 2000

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </svg>
  )
}

/** A running job, shown above the table until it finishes. */
function JobRow({ job }: { job: MediaJob }) {
  const active = ACTIVE_STATES.includes(job.state)
  const pct =
    job.progress.total > 0 ? Math.round((job.progress.done / job.progress.total) * 100) : 0
  const tone =
    job.state === 'failed'
      ? 'border-red-300 bg-red-50'
      : job.state === 'completed_with_errors'
        ? 'border-amber-300 bg-amber-50'
        : 'border-mist bg-cream'

  return (
    <div className={`rounded-md border px-3 py-2.5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-600">{job.sourceDoc}</span>
        <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[11px] font-semibold text-navy">
          {t.state[job.state] ?? job.state}
        </span>
        {job.progress.total > 0 && (
          <span className="text-[11px] text-slate-500">
            {job.progress.done} / {job.progress.total}
          </span>
        )}
      </div>

      {active && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist">
          <div
            className="h-full rounded-full bg-navy transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      )}

      {job.errors.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-amber-800">
            {t.errorCount(job.errors.length)}
          </summary>
          <ul className="mt-1 space-y-0.5">
            {job.errors.slice(0, 20).map((e, i) => (
              <li key={i} className="text-[11px] text-slate-600">
                {typeof e.locator.slide === 'number' ? `${t.slide} ${e.locator.slide}: ` : ''}
                {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Preview({ asset }: { asset: MediaAsset }) {
  const [failed, setFailed] = useState(false)
  const key = asset.blobKeys?.thumb ?? asset.blobKeys?.original
  // SVG assets are rendered as <img>, never inlined: the browser blocks script
  // and external fetches inside an <img>, which is a real boundary at no cost.
  if (failed || !key) {
    return (
      <div className="flex h-14 w-20 items-center justify-center rounded border border-mist bg-cream text-[10px] text-slate-400">
        {t.noPreview}
      </div>
    )
  }
  return (
    <img
      src={blobUrl(key)}
      alt={asset.descriptors?.altText ?? ''}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-20 rounded border border-mist bg-white object-contain"
    />
  )
}

export default function MediaTab() {
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<MediaJob[]>([])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const refreshAssets = useCallback(async (q: string) => {
    try {
      const { assets: rows } = await listAssets({ q: q.trim() || undefined })
      setAssets(rows)
      setSelected(new Set())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshJobs = useCallback(async () => {
    try {
      const { jobs: rows } = await listJobs()
      setJobs(rows)
      return rows
    } catch {
      return [] as MediaJob[]
    }
  }, [])

  useEffect(() => {
    void refreshJobs()
    void refreshAssets('')
  }, [refreshJobs, refreshAssets])

  // Poll while any job is active, not just after an upload. Driving it from the
  // job list rather than from one jobId means a reload mid-run keeps updating,
  // a re-submitted file that resolves to an existing job is followed too, and
  // nothing keeps ticking once everything has settled.
  const hasActive = jobs.some((j) => ACTIVE_STATES.includes(j.state))
  const wasActive = useRef(false)

  useEffect(() => {
    if (!hasActive) return undefined
    const id = window.setInterval(() => {
      void refreshJobs()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [hasActive, refreshJobs])

  // The moment the last job settles, the table is stale — reload it once.
  useEffect(() => {
    if (wasActive.current && !hasActive) void refreshAssets(query)
    wasActive.current = hasActive
  }, [hasActive, refreshAssets, query])

  const accepted = (file: File) =>
    ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))

  const upload = async (file?: File, force = false) => {
    if (!file) return
    setError(null)
    if (!accepted(file)) {
      setError(t.wrongType)
      return
    }
    try {
      const { reused } = await startIngest(file, force)
      if (reused) setError(t.reused)
      await refreshJobs()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const toggle = (assetId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })

  const allSelected = assets.length > 0 && selected.size === assets.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(assets.map((a) => a.assetId)))

  const removeSelected = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!window.confirm(t.removeManyConfirm(ids.length))) return
    const removing = new Set(ids)
    setAssets((prev) => prev.filter((x) => !removing.has(x.assetId)))   // optimistic
    setSelected(new Set())
    try {
      await retireMany(ids)
    } catch (e) {
      setError((e as Error).message)
      void refreshAssets(query)
    }
  }

  const remove = async (asset: MediaAsset) => {
    if (!window.confirm(t.removeConfirm(asset.descriptors?.altText ?? asset.assetId))) return
    setAssets((prev) => prev.filter((x) => x.assetId !== asset.assetId))   // optimistic
    try {
      await retireAsset(asset.assetId)
    } catch (e) {
      setError((e as Error).message)
      void refreshAssets(query)                                            // put it back
    }
  }

  const removeSource = async (sourceDoc: string) => {
    if (!window.confirm(t.removeSourceConfirm(sourceDoc))) return
    try {
      const { affected } = await retireBySource(sourceDoc)
      setError(t.removedSource(sourceDoc, affected))
      void refreshAssets(query)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const activeJobs = jobs.filter((j) => ACTIVE_STATES.includes(j.state))
  const recentJobs = jobs.filter((j) => !ACTIVE_STATES.includes(j.state)).slice(0, 3)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-navy">{t.heading}</h3>
        <p className="mt-0.5 text-sm text-slate-600">{t.intro}</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDrag(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          // Alt while dropping re-runs a deck that was already ingested — needed
          // whenever the pipeline itself has been fixed since the first run.
          void upload(e.dataTransfer.files[0], e.altKey)
        }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors ${
          drag ? 'border-navy bg-navy/5' : 'border-mist hover:border-navy hover:bg-cream'
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-navy">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span className="text-sm font-semibold text-navy">{t.drop}</span>
        <span className="text-xs text-slate-400">{t.formats}</span>
        <span className="text-[11px] text-slate-400">{t.forceHint}</span>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {(activeJobs.length > 0 || recentJobs.length > 0) && (
        <div className="space-y-2">
          {activeJobs.map((j) => <JobRow key={j.jobId} job={j} />)}
          {recentJobs.map((j) => (
            <div key={j.jobId} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <JobRow job={j} />
              </div>
              <button
                type="button"
                onClick={() => void removeSource(j.sourceDoc)}
                className="mt-1 shrink-0 rounded border border-mist px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
              >
                {t.removeSource}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Library */}
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void refreshAssets(query)
          }}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
        />
        <button
          type="button"
          onClick={() => void refreshAssets(query)}
          className="shrink-0 rounded-md border border-mist px-3 py-2 text-xs font-semibold text-navy hover:bg-cream"
        >
          {t.search}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-navy/20 bg-navy/5 px-3 py-2">
          <span className="text-sm text-navy">{t.selectedCount(selected.size)}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded border border-mist bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-cream"
            >
              {t.clearSelection}
            </button>
            <button
              type="button"
              onClick={() => void removeSelected()}
              className="flex items-center gap-1.5 rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <TrashIcon />
              {t.removeSelected}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">{labels.loading}</p>
      ) : assets.length === 0 ? (
        <p className="rounded-md border border-mist bg-cream px-3 py-6 text-center text-sm text-slate-500">
          {query ? t.noHits : t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-mist">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream text-slate-500">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={t.selectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 font-semibold">{t.colPreview}</th>
                <th className="px-3 py-2 font-semibold">{t.colTags}</th>
                <th className="px-3 py-2 font-semibold">{t.colMime}</th>
                <th className="px-3 py-2 font-semibold">{t.colSize}</th>
                <th className="px-3 py-2 font-semibold">{t.colDate}</th>
                <th className="px-3 py-2 font-semibold">{t.colUploader}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr
                  key={a.assetId}
                  className={`border-t border-mist align-top ${selected.has(a.assetId) ? 'bg-gold/10' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(a.assetId)}
                      onChange={() => toggle(a.assetId)}
                      aria-label={t.selectOne}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <a href={blobUrl(a.blobKeys?.original ?? '')} target="_blank" rel="noreferrer">
                      <Preview asset={a} />
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-navy">{a.descriptors?.altText ?? '—'}</p>
                    {a.descriptors?.description && (
                      <p className="mt-0.5 text-slate-500">{a.descriptors.description}</p>
                    )}
                    {(a.descriptors?.tags?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(a.descriptors?.tags ?? []).map((tag) => (
                          <span key={tag} className="rounded bg-navy/10 px-1.5 py-0.5 text-[10px] text-navy">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">
                      {a.provenance?.sourceDoc ?? '—'} · {t.slide} {a.provenance?.locator?.slide ?? '?'}
                      {a.descriptors?.altTextSource === 'author' && ` · ${t.authorAlt}`}
                    </p>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{a.mediaType}</td>
                  <td className="px-3 py-2 text-slate-500">{formatBytes(a.bytes ?? 0)}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(a.createdAt ?? '')}</td>
                  <td className="px-3 py-2 text-slate-500">{a.uploadedBy ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(a)}
                      title={t.remove}
                      aria-label={t.remove}
                      className="rounded border border-mist p-1.5 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
