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
 * Start an extraction. The file goes as a raw body with the name in a header —
 * the same shape the document converter already uses, so no multipart parser is
 * needed on either side.
 */
export async function startIngest(file: File): Promise<{ jobId: string; state: JobState; reused?: boolean }> {
  const res = await fetch(`${apiBaseUrl}/admin/media/ingest`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
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
