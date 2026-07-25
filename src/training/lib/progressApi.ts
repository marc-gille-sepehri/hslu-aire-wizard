// Client for training progress + the course/module catalog on hslu-aire-server.
//
// A learner is offered every course and its modules. The first interaction in a
// module records a ModuleProgress and consumes one course seat; when no order
// exists or all seats are taken the server answers 409 and we surface a
// SeatError so the UI can show the access dialog.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'
import type { ModuleSummary } from './moduleApi'

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

// ── Catalog ──────────────────────────────────────────────────────────────────

export interface CatalogCourse {
  id: string
  title: string
  description?: string
  published: boolean
  familyId: string
  version: number
  active: boolean
  modules: ModuleSummary[]
}

/** All courses with their modules — the `<Course> - <Module>` offering. */
export async function fetchCatalog(): Promise<CatalogCourse[]> {
  const res = await fetch(`${apiBaseUrl}/training/catalog`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await errorMessage(res))
  const body = await res.json()
  return body.courses as CatalogCourse[]
}

// ── Progress ─────────────────────────────────────────────────────────────────

export type Interaction =
  | { type: 'selection'; selectedIndex?: number; selectedOptionId?: string; correct: boolean }
  | { type: 'prompt'; prompt: string; model?: string }
  | { type: 'reflect'; text: string }
  | { type: 'bpmn'; xml: string }
  | { type: 'mcp'; url?: string; toolName?: string; urlEntered: boolean; toolFired: boolean }
  | { type: 'ontology'; explored: boolean }
  | { type: 'dataquery'; ran: boolean }
  | { type: 'graphview'; expanded: boolean }

export interface ModuleProgressRecord {
  moduleKey: string
  interactions: Record<string, unknown>
}
/** One learner's progress in one course: module version _id → its progress. */
export interface CourseProgressRecord {
  courseId: string
  updatedAt: string
  modules: Record<string, ModuleProgressRecord>
}

/**
 * A learner's course-progress records. Administrators may pass `asEmail` to read
 * another learner's progress (Teilnehmeransicht; global for now).
 */
export async function fetchUserProgress(asEmail?: string): Promise<CourseProgressRecord[]> {
  const q = asEmail ? `?asEmail=${encodeURIComponent(asEmail)}` : ''
  const res = await fetch(`${apiBaseUrl}/training/progress${q}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await errorMessage(res))
  const body = await res.json()
  return body.progress as CourseProgressRecord[]
}

export interface CourseParticipant {
  email: string
  firstName?: string
  lastName?: string
}

/** Learners enrolled in a course (admin only) — for the Teilnehmeransicht picker. */
export async function fetchCourseParticipants(courseId: string): Promise<CourseParticipant[]> {
  const res = await fetch(`${apiBaseUrl}/admin/courses/${courseId}/participants`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await errorMessage(res))
  const body = await res.json()
  return body.participants as CourseParticipant[]
}

/** A 409 from the seat gate — no order or no free seats for the course. */
export class SeatError extends Error {
  code: 'NO_ORDER' | 'NO_SEATS'
  constructor(code: 'NO_ORDER' | 'NO_SEATS', message: string) {
    super(message)
    this.name = 'SeatError'
    this.code = code
  }
}

export interface RecordInput {
  courseId: string
  moduleId: string
  artifactId: string
  interaction: Interaction
}

export interface RecordResult {
  progressId: string
  seatConsumed: boolean
}

/**
 * Record one interactive-block input. Throws `SeatError` on 409 (no order / no
 * seats) so the caller can show the access dialog; other failures throw a plain
 * Error.
 */
export async function recordInteraction(input: RecordInput): Promise<RecordResult> {
  const res = await fetch(`${apiBaseUrl}/training/progress`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (res.status === 409) {
    let code: 'NO_ORDER' | 'NO_SEATS' = 'NO_ORDER'
    let message = ''
    try {
      const body = await res.json()
      if (body?.code === 'NO_SEATS' || body?.code === 'NO_ORDER') code = body.code
      message = body?.error ?? ''
    } catch {
      // ignore
    }
    throw new SeatError(code, message)
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}
