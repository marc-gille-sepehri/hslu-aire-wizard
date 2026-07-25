// Client for the admin course & module management endpoints (Administrator only).
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'
import type { ModuleSummary } from '../lib/moduleApi'

/** A course with its ordered list of modules. */
export interface CourseWithModules {
  id: string
  title: string
  description?: string
  published: boolean
  familyId: string
  version: number
  active: boolean
  modules: ModuleSummary[]
}

export class CoursesError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'CoursesError'
    this.status = status
    this.code = code
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseError(res: Response): Promise<CoursesError> {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    // no JSON body
  }
  return new CoursesError(body?.error || `Fehler (${res.status})`, res.status, body?.code)
}

// --- Courses ---

export async function listCourses(): Promise<CourseWithModules[]> {
  const res = await fetch(`${apiBaseUrl}/admin/courses`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.courses as CourseWithModules[]
}

export async function createCourse(input: { title: string; description?: string }): Promise<CourseWithModules> {
  const res = await fetch(`${apiBaseUrl}/admin/courses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.course as CourseWithModules
}

export async function deleteCourse(id: string): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/courses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
}

/** Rename / re-describe a course. */
export async function updateCourse(id: string, patch: { title?: string; description?: string; published?: boolean }): Promise<CourseWithModules> {
  const res = await fetch(`${apiBaseUrl}/admin/courses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.course as CourseWithModules
}

/** Clone a course into a new inactive/unpublished version of its family. */
export async function cloneCourse(id: string): Promise<CourseWithModules> {
  const res = await fetch(`${apiBaseUrl}/admin/courses/${encodeURIComponent(id)}/clone`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.course as CourseWithModules
}

/** Make a course version the active one for its family. */
export async function setActiveCourseVersion(id: string): Promise<CourseWithModules> {
  const res = await fetch(`${apiBaseUrl}/admin/courses/${encodeURIComponent(id)}/active`, {
    method: 'PUT',
    headers: authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.course as CourseWithModules
}

/** Update a module's title and/or description. */
export async function updateModule(id: string, patch: { title?: string; description?: string }): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/modules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw await parseError(res)
}

/** Set the full ordered module-id list of a course (used for add, remove, reorder). */
export async function setCourseModules(id: string, moduleIds: string[]): Promise<CourseWithModules> {
  const res = await fetch(`${apiBaseUrl}/admin/courses/${encodeURIComponent(id)}/modules`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ moduleIds }),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.course as CourseWithModules
}

// --- Modules ---

export async function createModule(input: { title: string }): Promise<{ id: string }> {
  const res = await fetch(`${apiBaseUrl}/admin/modules`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body as { id: string }
}
