// Client for the media library (Administrator only).
//
// The portal orchestrates extraction; this only starts a job, polls it, and
// lists what came out. See hslu-aire-doc-service/docs/spec-media-extraction.md.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export type JobState =
  | 'queued'
  | 'preparing'
  | 'enumerating'
  | 'rendering'
  | 'deriving'
  | 'indexing'
  | 'done'
  | 'completed_with_errors'
  | 'failed'

/** States where the job is still moving — the poll keeps running. */
export const ACTIVE_STATES: JobState[] = [
  'queued', 'preparing', 'enumerating', 'rendering', 'deriving', 'indexing',
]

export interface MediaJob {
  jobId: string
  state: JobState
  progress: { done: number; total: number }
  counts: Record<string, number>
  errors: { locator: Record<string, unknown>; message: string }[]
  assetIds: string[]
  sourceDoc: string
  attempts: number
  createdAt: string
  updatedAt: string
}

export interface MediaAsset {
  assetId: string
  sha256: string
  class: string
  mediaType: string
  bytes: number
  dimensions: Record<string, number | string> | null
  blobKeys: { original: string; web?: string; thumb?: string }
  provenance: {
    sourceDoc: string
    sourceType: string
    locator: { slide: number; shapeIds: string[] }
    method: string
    extractedAt: string
  }
  context: { slideTitle: string | null; shapeName: string | null }
  descriptors: {
    altText: string
    altTextSource: 'author' | 'generated'
    description: string
    tags: string[]
    hasEmbedding: boolean
  }
  rights: { license: string }
  review: { state: string; reasons: string[]; vectorConfidence: number }
  uploadedBy: string | null
  createdAt: string
  retired: boolean
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `Fehler ${res.status}`)
  }
  return body as T
}

/**
 * PUT the file straight to S3.
 *
 * XHR rather than fetch, for the one thing fetch still cannot do: report upload
 * progress. A 285 MB deck takes minutes on a normal connection, and a drop zone
 * that shows nothing for minutes reads as broken.
 */
function putToS3(
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    // Must match the signed content type exactly, or S3 rejects the signature.
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload fehlgeschlagen (${xhr.status})`))
    xhr.onerror = () => reject(new Error('Upload fehlgeschlagen — Netzwerkfehler'))
    xhr.onabort = () => reject(new Error('Upload abgebrochen'))
    xhr.send(file)
  })
}

/**
 * Start an extraction: presign, upload direct to S3, then hand the portal a key.
 *
 * The file no longer passes through the portal at all. It used to go as a raw
 * body, which meant a 2 GB service had to hold the whole deck in memory to
 * accomplish a copy into S3 — the ceiling that made a 285 MB source impossible.
 */
export async function startIngest(
  file: File,
  force = false,
  onProgress: (fraction: number) => void = () => {},
): Promise<{ jobId: string; state: JobState; reused?: boolean }> {
  const grant = await asJson<{ key: string; url: string; contentType: string }>(
    await fetch(`${apiBaseUrl}/admin/media/upload-url`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }),
    }),
  )

  onProgress(0)
  await putToS3(grant.url, file, grant.contentType, onProgress)
  onProgress(1)

  const res = await fetch(`${apiBaseUrl}/admin/media/ingest${force ? '?force=true' : ''}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentKey: grant.key, filename: file.name }),
  })
  return asJson(res)
}

/**
 * Fill in anything the server left out.
 *
 * The two job endpoints briefly disagreed on their shape — the list route
 * returned raw documents without `errors`, and reading `.length` on that
 * unmounted the whole admin screen. The server is fixed; this makes the UI
 * unable to be taken down by a field again.
 */
function normaliseJob(raw: Partial<MediaJob> & { _id?: string }): MediaJob {
  return {
    jobId: raw.jobId ?? raw._id ?? '',
    state: raw.state ?? 'queued',
    progress: raw.progress ?? { done: 0, total: 0 },
    counts: raw.counts ?? {},
    errors: raw.errors ?? [],
    assetIds: raw.assetIds ?? [],
    sourceDoc: raw.sourceDoc ?? '—',
    attempts: raw.attempts ?? 0,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  }
}

export async function getJob(jobId: string): Promise<MediaJob> {
  const res = await fetch(`${apiBaseUrl}/admin/media/ingest/${jobId}`, { headers: authHeaders() })
  return normaliseJob(await asJson(res))
}

export async function listJobs(): Promise<{ jobs: MediaJob[] }> {
  const res = await fetch(`${apiBaseUrl}/admin/media/jobs`, { headers: authHeaders() })
  const body = await asJson<{ jobs?: unknown[] }>(res)
  return { jobs: (body.jobs ?? []).map((j) => normaliseJob(j as Partial<MediaJob>)) }
}

export async function listAssets(params: { q?: string; limit?: number } = {}): Promise<{ assets: MediaAsset[] }> {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  query.set('limit', String(params.limit ?? 100))
  const res = await fetch(`${apiBaseUrl}/admin/media/assets?${query}`, { headers: authHeaders() })
  return asJson(res)
}

/**
 * Remove an asset from the library.
 *
 * Retires by default rather than deleting: blobs are content-addressed and shared
 * between assets, and an asset attached to a course revision must not dangle. A
 * retired asset disappears from the listing, which is what this needs to mean.
 */
export async function retireAsset(assetId: string): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/media/assets/${assetId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await asJson(res)
}

/** Retire everything that came out of one source document. */
export async function retireBySource(sourceDoc: string): Promise<{ affected: number }> {
  const res = await fetch(`${apiBaseUrl}/admin/media/assets/retire`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceDoc }),
  })
  return asJson(res)
}

/**
 * Delete a whole run - the job and the assets it produced.
 *
 * Retiring assets leaves the job behind, and idempotency on the file hash then
 * blocks the same source from ever being ingested again. Removing the run is
 * what deleting a source has to mean.
 */
export async function deleteJob(jobId: string): Promise<{ purgedAssets: number }> {
  const res = await fetch(`${apiBaseUrl}/admin/media/jobs/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return asJson(res)
}

/** Retire a selection in one call rather than one request per row. */
export async function retireMany(assetIds: string[]): Promise<{ affected: number }> {
  const res = await fetch(`${apiBaseUrl}/admin/media/assets/retire`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetIds }),
  })
  return asJson(res)
}

/**
 * Blob URL for an <img>.
 *
 * The bucket is private; the portal proxies reads under /documents/. That route
 * is deliberately unauthenticated because an <img> cannot send an Authorization
 * header — it is restricted by key prefix instead.
 */
export function blobUrl(key: string): string {
  return `${apiBaseUrl}/documents/${key}`
}

const UNITS = ['B', 'KB', 'MB', 'GB']

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1).replace('.', ',')} ${UNITS[unit]}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })
}
