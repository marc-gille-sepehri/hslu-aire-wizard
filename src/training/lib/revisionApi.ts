// Client for the module revision log on hslu-aire-server (module-revision spec
// §5/§6). Every module write on the server is logged; this is how the editor
// reads that history back, previews it, compares it and restores from it.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'
import type { Resource, Section } from '../schema/types'

export type RevisionTool =
  | 'create'
  | 'add_sections'
  | 'update_section'
  | 'set_module_sections'
  | 'update_module'
  | 'portal'
  | 'restore'
  | 'course_copy'
  | 'migration'

export interface RevisionActor {
  /** `mcp` is an agent, `user` a person in the portal, `system` the server itself. */
  kind: 'user' | 'mcp' | 'system'
  subject: string
}

/** One history row. Deliberately carries no snapshot — see loadRevision. */
export interface RevisionSummary {
  rev: number
  note: string
  tool: RevisionTool
  actor: RevisionActor
  ts: string
  title: string
  sectionCount: number
  artifactCount: number
  restoredFrom?: number
  forkedFrom?: { moduleId: string; rev: number }
}

export interface RevisionSnapshot {
  moduleId: string
  rev: number
  note: string
  tool: RevisionTool
  actor: RevisionActor
  ts: string
  title: string
  description?: string
  lang: string
  resources: Record<string, Resource>
  sections: Section[]
  restoredFrom?: number
  forkedFrom?: { moduleId: string; rev: number }
}

export type ChangeStatus = 'added' | 'removed' | 'moved' | 'changed' | 'unchanged'

export interface WordDiffPart {
  op: 'same' | 'add' | 'remove'
  text: string
}

export interface FieldDiff {
  field: string
  from: unknown
  to: unknown
  words?: WordDiffPart[]
}

export interface ArtifactDiff {
  id: string
  type?: string
  status: ChangeStatus
  fromIndex: number | null
  toIndex: number | null
  moved?: { from: number; to: number }
  fields?: FieldDiff[]
}

export interface SectionDiff {
  id: string
  title: string
  status: ChangeStatus
  fromIndex: number | null
  toIndex: number | null
  moved?: { from: number; to: number }
  titleChanged?: { from: string; to: string }
  objectivesChanged?: { from?: string[]; to?: string[] }
  artifacts: ArtifactDiff[]
  unchangedArtifactCount: number
}

export interface ModuleDiff {
  fromRev: number
  toRev: number
  titleChanged?: { from: string; to: string }
  descriptionChanged?: { from?: string; to?: string }
  sections: SectionDiff[]
  summary: {
    sectionsAdded: number
    sectionsRemoved: number
    sectionsMoved: number
    sectionsChanged: number
    artifactsAdded: number
    artifactsRemoved: number
    artifactsMoved: number
    artifactsChanged: number
    unchanged: boolean
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Carries the server's error code so callers can branch on REV_CONFLICT. */
export class ApiError extends Error {
  code?: string
  status: number
  currentRev?: number
  /** Present on STALE_DRAFT — names the revision an override would bury. */
  stale?: StaleInfo
  constructor(message: string, status: number, code?: string, currentRev?: number, stale?: StaleInfo) {
    super(message)
    this.status = status
    this.code = code
    this.currentRev = currentRev
    this.stale = stale
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, { headers: authHeaders(), ...init })
  if (!res.ok) {
    let message = `Fehler (${res.status})`
    let code: string | undefined
    let currentRev: number | undefined
    let stale: StaleInfo | undefined
    try {
      const body = await res.json()
      if (body?.error) message = body.error
      code = body?.code
      currentRev = body?.currentRev
      if (body?.code === 'STALE_DRAFT') {
        stale = { baseRev: body.baseRev, currentRev: body.currentRev, intervening: body.intervening ?? null }
      }
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status, code, currentRev, stale)
  }
  return res.json() as Promise<T>
}

export async function listRevisions(
  moduleId: string,
  opts: { limit?: number; before?: number } = {},
): Promise<{ moduleId: string; currentRev: number; revisions: RevisionSummary[] }> {
  const params = new URLSearchParams()
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.before !== undefined) params.set('before', String(opts.before))
  const q = params.toString()
  return request(`/admin/modules/${encodeURIComponent(moduleId)}/revisions${q ? `?${q}` : ''}`)
}

export async function loadRevision(moduleId: string, rev: number): Promise<RevisionSnapshot> {
  return request(`/admin/modules/${encodeURIComponent(moduleId)}/revisions/${rev}`)
}

export async function loadDiff(moduleId: string, fromRev: number, toRev: number): Promise<ModuleDiff> {
  return request(`/admin/modules/${encodeURIComponent(moduleId)}/diff?fromRev=${fromRev}&toRev=${toRev}`)
}

/** Writes the old content back as a NEW revision; nothing is deleted. */
export async function restoreRevision(
  moduleId: string,
  rev: number,
  opts: { note?: string; expectedRev?: number } = {},
): Promise<{ ok: boolean; rev: number; restoredFrom: number }> {
  return request(`/admin/modules/${encodeURIComponent(moduleId)}/restore`, {
    method: 'POST',
    body: JSON.stringify({ rev, ...opts }),
  })
}

// ── Drafts: autosave target, never a revision ───────────────────────────────
//
// The split that makes autosave and a mandatory change note coexist:
//   PUT  /modules/:id/draft   continuous, no note, no rev bump
//   POST /modules/:id/commit  explicit, note required, one revision

export interface DraftContent {
  title?: string
  description?: string
  lang?: string
  resources?: Record<string, Resource>
  sections?: Section[]
}

export interface ModuleDraft extends DraftContent {
  baseRev: number
  contentHash: string
  createdAt: string
  updatedAt: string
}

/** The module moved on while the draft was open — whose change would be buried. */
export interface StaleInfo {
  baseRev: number
  currentRev: number
  intervening: RevisionSummary | null
}

export interface DraftState {
  draft: ModuleDraft | null
  moduleRev: number
  moduleContentHash: string
  stale: StaleInfo | null
}

export async function loadDraft(moduleId: string): Promise<DraftState> {
  return request(`/modules/${encodeURIComponent(moduleId)}/draft`)
}

export async function saveDraft(
  moduleId: string,
  draft: DraftContent & { baseRev: number },
): Promise<{ ok: boolean; updatedAt: string; contentHash: string; moduleRev: number; stale: StaleInfo | null }> {
  return request(`/modules/${encodeURIComponent(moduleId)}/draft`, {
    method: 'PUT',
    body: JSON.stringify(draft),
  })
}

/**
 * Last-gasp autosave on unload. `keepalive` is what lets the request outlive the
 * page — sendBeacon cannot carry the Authorization header, so this is the way.
 */
export function saveDraftOnUnload(moduleId: string, draft: DraftContent & { baseRev: number }): void {
  try {
    void fetch(`${apiBaseUrl}/modules/${encodeURIComponent(moduleId)}/draft`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(draft),
      keepalive: true,
    })
  } catch {
    // Best effort by definition.
  }
}

export async function discardDraft(moduleId: string): Promise<void> {
  await request(`/modules/${encodeURIComponent(moduleId)}/draft`, { method: 'DELETE' })
}

/** What the draft would change against the committed content. */
export async function loadDraftDiff(moduleId: string): Promise<ModuleDiff> {
  return request(`/modules/${encodeURIComponent(moduleId)}/draft/diff`)
}

export interface CommitResult {
  ok: true
  rev: number
}

/**
 * Commit the draft. Throws an ApiError whose `code` distinguishes the cases the
 * editor must handle differently: NOTE_REQUIRED, STALE_DRAFT, NO_DRAFT.
 */
export async function commitDraft(
  moduleId: string,
  body: { note: string; expectedRev?: number; override?: boolean },
): Promise<CommitResult> {
  return request(`/modules/${encodeURIComponent(moduleId)}/commit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
