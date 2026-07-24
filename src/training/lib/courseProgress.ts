// Learner progress rolled up per course, for the training dashboard.
//
// Completion is measured in *tracked blocks*: every artifact with `tracked` not
// false counts toward a course's total; a tracked block is done when the user has
// a recorded interaction for it (ModuleProgress). A course is complete at 100%.
import { fetchCatalog, fetchUserProgress, type CatalogCourse } from './progressApi'
import { fetchModule } from './moduleApi'

export interface CourseProgress {
  id: string
  title: string
  /** Where the course switcher jumps in (first module of the course). */
  firstModuleId: string | null
  totalTracked: number
  completedTracked: number
  /** 0–100, rounded. */
  pct: number
  started: boolean
  completed: boolean
}

export interface ProgressSummary {
  courses: CourseProgress[]
  offeredCount: number
  completedCount: number
  /** One certificate per fully completed course. */
  certificates: number
  startedCourses: CourseProgress[]
  /** For the catalog's "in Bearbeitung" markers. */
  startedModuleIds: Set<string>
  /** Raw catalog (with module lists) so the caller can render the offering. */
  catalog: CatalogCourse[]
}

interface SectionLike {
  artifacts?: { id?: string; tracked?: boolean }[]
}
interface ModuleLike {
  sections?: SectionLike[]
}

/** Tracked-block total + completed count for one module version. */
function moduleTracked(mod: ModuleLike | null, interactions: Record<string, unknown>): { total: number; done: number } {
  if (!mod) return { total: 0, done: 0 }
  let total = 0
  let done = 0
  for (const sec of mod.sections ?? []) {
    for (const a of sec.artifacts ?? []) {
      if (a.tracked === false || !a.id) continue
      total++
      if (interactions[a.id] != null) done++
    }
  }
  return { total, done }
}

/** Load the catalog + the user's progress and compute per-course completion. */
export async function loadCourseProgress(): Promise<ProgressSummary> {
  const [courses, progress] = await Promise.all([
    fetchCatalog(),
    fetchUserProgress().catch(() => []),
  ])

  const offered = courses.filter((c) => c.modules.length > 0)
  const progByModule = new Map(progress.map((p) => [p.moduleId, p]))

  // Fetch each distinct module's content once (needed to count tracked blocks).
  const moduleIds = [...new Set(offered.flatMap((c) => c.modules.map((m) => m.id)))]
  const entries = await Promise.all(
    moduleIds.map((id) =>
      fetchModule(id)
        .then((p) => [id, p.module as ModuleLike] as const)
        .catch(() => [id, null] as const),
    ),
  )
  const contentById = new Map(entries)

  const cps: CourseProgress[] = offered.map((c) => {
    let total = 0
    let done = 0
    for (const m of c.modules) {
      const interactions = (progByModule.get(m.id)?.interactions as Record<string, unknown>) ?? {}
      const s = moduleTracked(contentById.get(m.id) ?? null, interactions)
      total += s.total
      done += s.done
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return {
      id: c.id,
      title: c.title,
      firstModuleId: c.modules[0]?.id ?? null,
      totalTracked: total,
      completedTracked: done,
      pct,
      started: c.modules.some((m) => progByModule.has(m.id)),
      completed: total > 0 && done >= total,
    }
  })

  const completedCount = cps.filter((c) => c.completed).length
  return {
    courses: cps,
    offeredCount: offered.length,
    completedCount,
    certificates: completedCount,
    startedCourses: cps.filter((c) => c.started),
    startedModuleIds: new Set(progress.map((p) => p.moduleId)),
    catalog: courses,
  }
}
