// Client for DB-backed training modules on hslu-aire-server.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'
import { ApiError } from './revisionApi'

export interface ModuleSummary {
  id: string
  moduleKey: string
  title: string
  description?: string
  updatedAt: string
}

export interface ModuleMeta {
  moduleKey: string
  /** Current revision; sent back as `expectedRev` so concurrent saves surface. */
  rev?: number
}

/** Raw training-module payload: { module: {...}, meta }. */
export interface ModulePayload {
  module: unknown
  meta: ModuleMeta
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body?.error) return body.error
  } catch {
    // ignore
  }
  return `Fehler (${res.status})`
}

/** One module's content, in the training schema shape (+ meta). */
export async function fetchModule(id: string): Promise<ModulePayload> {
  const res = await fetch(`${apiBaseUrl}/modules/${encodeURIComponent(id)}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export interface SaveModuleContent {
  title?: string
  lang?: string
  resources?: Record<string, unknown>
  sections: unknown[]
  /** What changed, in one sentence — shown in the module history. */
  note?: string
  /** The rev the edit started from; the server refuses a stale write. */
  expectedRev?: number
}

/**
 * Persist edited content back to a module version (Administrator only). Every
 * successful save commits one revision on the server, so `note` is what makes
 * the history navigable later. A concurrent edit comes back as a REV_CONFLICT
 * ApiError rather than overwriting the other author.
 */
export async function saveModule(
  id: string,
  content: SaveModuleContent,
): Promise<ModulePayload & { rev?: number }> {
  const res = await fetch(`${apiBaseUrl}/modules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(content),
  })
  if (!res.ok) {
    let code: string | undefined
    let currentRev: number | undefined
    let message = `Fehler (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
      code = body?.code
      currentRev = body?.currentRev
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code, currentRev)
  }
  return res.json()
}
