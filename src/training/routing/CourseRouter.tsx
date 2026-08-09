import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import '../styles.css'
import { labels } from '../labels'
import { useAuth } from '../auth/AuthContext'
import LoginGate from '../auth/LoginGate'
import { fetchCatalog, type CatalogCourse } from '../lib/progressApi'
import TrainingApp from '../TrainingApp'
import {
  courseHasModule,
  courseUrl,
  findActiveInFamily,
  findCourse,
  findCourseForModule,
  moduleUrl,
  sectionUrl,
  visibilityOf,
} from './courseUrls'

const t = labels.routes

// Resolves every address shape in the URL contract against the catalog the
// portal already loads. Two properties this file exists to keep:
//
//   • The canonical path is redundant and is CHECKED, not trusted. If the course
//     does not contain the module, that is a dead address — not an invitation to
//     quietly redirect to the place we guess was meant. A silent correction
//     hides the broken slide instead of surfacing it.
//   • Short forms and /active resolve to the canonical path and REPLACE the
//     history entry, so Back does not bounce through the redirect.
//
// The portal is served as a static site, so a redirect is a history replace and
// "404" is a view, not a status code. What a reader sees is the same; a link
// checker would see 200. Real status codes would mean routing these paths
// through the API server instead of GitHub Pages.

type Mode = 'course' | 'module' | 'section' | 'active' | 'short-module' | 'short-section'

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; catalog: CatalogCourse[] }

export default function CourseRouter({ mode }: { mode: Mode }) {
  const { status, user } = useAuth()
  const params = useParams()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const isAdmin = !!user?.roles?.includes('Administrator')

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    setState({ kind: 'loading' })
    fetchCatalog()
      .then((catalog) => !cancelled && setState({ kind: 'ready', catalog }))
      .catch((e) => !cancelled && setState({ kind: 'error', message: (e as Error).message }))
    return () => {
      cancelled = true
    }
  }, [status])

  if (status === 'checking') return <Shell><p className="text-slate-500">{labels.auth.checking}</p></Shell>
  if (status === 'anonymous') {
    return (
      <div className="training-root font-sans">
        <LoginGate />
      </div>
    )
  }
  if (state.kind === 'loading') return <Shell><p className="text-slate-500">{t.resolving}</p></Shell>
  if (state.kind === 'error') {
    return (
      <Shell>
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{state.message}</div>
      </Shell>
    )
  }

  const { catalog } = state
  const { courseId, moduleId, sectionId, familyId } = params as Record<string, string | undefined>

  // ── Short forms and /active: resolve, then replace the history entry ───────
  if (mode === 'active') {
    const active = findActiveInFamily(catalog, familyId ?? '')
    if (!active || !visible(active, isAdmin)) return <NotFound />
    return <Navigate to={courseUrl(active.id)} replace />
  }
  if (mode === 'short-module' || mode === 'short-section') {
    const course = findCourseForModule(catalog, moduleId ?? '')
    if (!course || !visible(course, isAdmin)) return <NotFound />
    return (
      <Navigate
        to={
          mode === 'short-section'
            ? sectionUrl(course.id, moduleId!, sectionId!)
            : moduleUrl(course.id, moduleId!)
        }
        replace
      />
    )
  }

  // ── Canonical paths: every segment has to hold ────────────────────────────
  const course = findCourse(catalog, courseId ?? '')
  if (!course || !visible(course, isAdmin)) return <NotFound />
  if (mode !== 'course' && !courseHasModule(course, moduleId ?? '')) return <NotFound />

  const banner = <VersionBanner course={course} catalog={catalog} isAdmin={isAdmin} />

  if (mode === 'course') {
    return (
      <Shell>
        {banner}
        <CourseOverview course={course} />
      </Shell>
    )
  }

  // The module view validates the section itself — it is the one that holds the
  // module content, and re-fetching it here just to check an id would be waste.
  return (
    <>
      {(visibilityOf(course) !== 'ok' || !course.published) && (
        <div className="training-root font-sans">
          <div className="mx-auto max-w-prose px-4 pt-6">{banner}</div>
        </div>
      )}
      <TrainingApp
        courseIdOverride={course.id}
        moduleIdOverride={moduleId}
        sectionIdOverride={mode === 'section' ? sectionId : undefined}
      />
    </>
  )
}

/** Unpublished is a 404 for everyone but an administrator. */
const visible = (course: CatalogCourse, isAdmin: boolean) =>
  visibilityOf(course) !== 'hidden' || isAdmin

function VersionBanner({
  course,
  catalog,
  isAdmin,
}: {
  course: CatalogCourse
  catalog: CatalogCourse[]
  isAdmin: boolean
}) {
  const v = visibilityOf(course)
  if (v === 'hidden') {
    return isAdmin ? (
      <aside className="mb-6 rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-slate-800">
        <strong className="font-semibold">{t.unpublishedTag}.</strong> {t.adminOnlyHint}
      </aside>
    ) : null
  }
  if (v === 'ok') return null
  const active = findActiveInFamily(catalog, course.familyId)
  return (
    <aside className="mb-6 rounded-md border border-amber-400 border-l-4 border-l-gold bg-gold-soft px-4 py-3 text-sm text-slate-800">
      <p className="font-display font-bold text-navy">{t.supersededTitle}</p>
      <p className="mt-1">{t.supersededBody(course.version)}</p>
      {active && (
        <Link
          to={courseUrl(active.id)}
          className="mt-1 inline-block font-semibold text-navy underline underline-offset-2 hover:text-gold-dark"
        >
          {t.toActive}
        </Link>
      )}
    </aside>
  )
}

/** `/courses/{id}` — the course and the way into its modules. */
function CourseOverview({ course }: { course: CatalogCourse }) {
  return (
    <div className="space-y-6">
      <div>
        <Link to="/training" className="text-sm text-slate-500 hover:text-navy">
          {t.toCatalog}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy">{course.title}</h1>
        {course.description && <p className="mt-1 max-w-prose text-slate-600">{course.description}</p>}
      </div>

      <div>
        <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
          {t.courseModules}
        </h2>
        {course.modules.length === 0 ? (
          <p className="text-slate-500">{t.noModules}</p>
        ) : (
          <ol className="list-none divide-y divide-mist border-y border-mist">
            {course.modules.map((m, i) => (
              <li key={m.id}>
                <Link
                  to={moduleUrl(course.id, m.id)}
                  className="flex items-baseline gap-3 px-1 py-3 no-underline transition-colors hover:bg-cream"
                >
                  <span className="w-6 shrink-0 text-xs font-semibold text-slate-400">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy">{m.title}</span>
                    {m.description && <span className="block text-sm text-slate-500">{m.description}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-navy">{t.notFoundTitle}</h1>
      <p className="mt-2 max-w-prose text-slate-600">{t.notFoundBody}</p>
      <Link to="/training" className="mt-4 inline-block text-sm text-slate-500 underline underline-offset-2 hover:text-navy">
        {t.toCatalog}
      </Link>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="training-root font-sans">
      <div className="mx-auto max-w-prose px-4 py-10">{children}</div>
    </div>
  )
}
