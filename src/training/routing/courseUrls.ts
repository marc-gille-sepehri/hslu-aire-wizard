// Addresses for every place in a course, so slides, e-mails and printed handouts
// can point at one. An address names a place — it changes nothing, writes
// nothing, measures nothing.
//
// Two shapes exist on purpose:
//   • the canonical path, which is redundant (the moduleId alone would identify
//     the module) so that a URL read off a slide says what it points at;
//   • short forms for projection, which resolve to the canonical path.
//
// Everything here is pure string work plus lookups over the catalog the portal
// already loads. There is no server route behind it.
import type { CatalogCourse } from '../lib/progressApi'

export const courseUrl = (courseId: string) => `/courses/${courseId}`
export const moduleUrl = (courseId: string, moduleId: string) =>
  `${courseUrl(courseId)}/modules/${moduleId}`
export const sectionUrl = (courseId: string, moduleId: string, sectionId: string) =>
  `${moduleUrl(courseId, moduleId)}/sections/${sectionId}`

/** Points at a course family rather than a version — for printed material. */
export const activeVersionUrl = (familyId: string) => `/courses/${familyId}/active`

/** Short forms. Ninety characters are unreadable on a projected slide. */
export const shortModuleUrl = (moduleId: string) => `/m/${moduleId}`
export const shortSectionUrl = (moduleId: string, sectionId: string) =>
  `/s/${moduleId}/${sectionId}`

/** A single artifact is a fragment, not a path: same page, portal scrolls there. */
export const artifactHash = (artifactId: string) => `#a=${artifactId}`

/** Reads `#a=sec-2-a5`. Returns null for any other fragment. */
export function artifactFromHash(hash: string): string | null {
  const m = /^#a=(.+)$/.exec(hash || '')
  return m ? decodeURIComponent(m[1]) : null
}

/**
 * What a course version is to the reader.
 *   'ok'          published and active — the version learners get
 *   'superseded'  published but no longer active; reachable, marked as outdated
 *   'hidden'      unpublished; a 404 for everyone but an administrator, because
 *                 the existence of a draft is not itself public
 */
export type Visibility = 'ok' | 'superseded' | 'hidden'

export function visibilityOf(course: CatalogCourse): Visibility {
  if (!course.published) return 'hidden'
  return course.active ? 'ok' : 'superseded'
}

export const findCourse = (catalog: CatalogCourse[], courseId: string) =>
  catalog.find((c) => c.id === courseId) ?? null

/** The active version of a family — what `/courses/{family}/active` resolves to. */
export const findActiveInFamily = (catalog: CatalogCourse[], familyId: string) =>
  catalog.find((c) => c.familyId === familyId && c.active) ?? null

/**
 * The course a module belongs to. A module can sit in several versions of the
 * same course, so prefer the one a reader should land on: published and active
 * first, then published, then whatever is left (an administrator following a
 * link into a draft).
 */
export function findCourseForModule(
  catalog: CatalogCourse[],
  moduleId: string,
): CatalogCourse | null {
  const holders = catalog.filter((c) => c.modules.some((m) => m.id === moduleId))
  return (
    holders.find((c) => c.published && c.active) ??
    holders.find((c) => c.published) ??
    holders[0] ??
    null
  )
}

/** Does this course version actually contain the module? A mismatch is a 404. */
export const courseHasModule = (course: CatalogCourse, moduleId: string) =>
  course.modules.some((m) => m.id === moduleId)
