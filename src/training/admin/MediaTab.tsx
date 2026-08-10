import { useCallback, useEffect, useRef, useState } from 'react'

import { labels } from '../labels'
import {
  ACTIVE_STATES,
  type MediaAsset,
  type MediaJob,
  blobUrl,
  formatBytes,
  formatDate,
  getJob,
  listAssets,
  listJobs,
  startIngest,
} from './mediaApi'

const t = labels.adminMedia

const ACCEPTED = ['.pptx', '.pptm', '.pdf']
const POLL_MS = 2000

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
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<number | null>(null)

  const refreshAssets = useCallback(async (q: string) => {
    try {
      const { assets: rows } = await listAssets({ q: q.trim() || undefined })
      setAssets(rows)
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

  // Poll only while something is actually running, and stop as soon as it is not
  // — an admin screen left open should not hold an endless request loop.
  const startPolling = useCallback(
    (jobId: string) => {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = window.setInterval(async () => {
        try {
          const job = await getJob(jobId)
          setJobs((prev) => {
            const rest = prev.filter((j) => j.jobId !== job.jobId)
            return [job, ...rest]
          })
          if (!ACTIVE_STATES.includes(job.state)) {
            if (pollRef.current) window.clearInterval(pollRef.current)
            pollRef.current = null
            void refreshAssets(query)
          }
        } catch {
          /* transient — the next tick tries again */
        }
      }, POLL_MS)
    },
    [refreshAssets, query],
  )

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current)
  }, [])

  const accepted = (file: File) =>
    ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))

  const upload = async (file?: File) => {
    if (!file) return
    setError(null)
    if (!accepted(file)) {
      setError(t.wrongType)
      return
    }
    try {
      const { jobId, reused } = await startIngest(file)
      if (reused) setError(t.reused)
      await refreshJobs()
      startPolling(jobId)
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
          void upload(e.dataTransfer.files[0])
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
          {recentJobs.map((j) => <JobRow key={j.jobId} job={j} />)}
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
                <th className="px-3 py-2 font-semibold">{t.colPreview}</th>
                <th className="px-3 py-2 font-semibold">{t.colTags}</th>
                <th className="px-3 py-2 font-semibold">{t.colMime}</th>
                <th className="px-3 py-2 font-semibold">{t.colSize}</th>
                <th className="px-3 py-2 font-semibold">{t.colDate}</th>
                <th className="px-3 py-2 font-semibold">{t.colUploader}</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.assetId} className="border-t border-mist align-top">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
