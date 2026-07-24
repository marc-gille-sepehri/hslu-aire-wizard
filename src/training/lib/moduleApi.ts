// Client for DB-backed training modules on hslu-aire-server.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface ModuleSummary {
  id: string
  familyId: string
  moduleKey: string
  title: string
  version: number
  current: boolean
  updatedAt: string
}

export interface ModuleMeta {
  moduleKey: string
  familyId: string
  version: number
  current: boolean
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

/** Current version of every module (for the switcher / default). */
export async function fetchModuleList(): Promise<ModuleSummary[]> {
  const res = await fetch(`${apiBaseUrl}/modules`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await errorMessage(res))
  const body = await res.json()
  return body.modules as ModuleSummary[]
}

/** One module version's content, in the training schema shape (+ meta). */
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
}

/** Persist edited content back to a module version (Administrator only). */
export async function saveModule(id: string, content: SaveModuleContent): Promise<ModulePayload> {
  const res = await fetch(`${apiBaseUrl}/modules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(content),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}
