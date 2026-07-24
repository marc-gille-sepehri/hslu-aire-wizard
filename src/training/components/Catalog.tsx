import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadCourseProgress, type ProgressSummary } from '../lib/courseProgress'
import { useEditMode } from '../editor/EditModeContext'
import ProgressDashboard from './ProgressDashboard'
import { labels } from '../labels'

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; summary: ProgressSummary }

/**
 * The offering: every course and its modules as `<Course> - <Module>`. Selecting
 * a module opens `/training/:courseId/:moduleId`, where the first interaction
 * consumes a seat (or the seat dialog appears). A progress dashboard sits on top
 * (view mode only). Modules the user already has progress on are marked.
 */
export default function Catalog() {
  const { editing } = useEditMode()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    ;(async () => {
      try {
        const summary = await loadCourseProgress()
        if (!cancelled) setState({ kind: 'ready', summary })
      } catch (e) {
        if (!cancelled) setState({ kind: 'error', message: (e as Error).message || labels.catalog.loadError })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const hasAnyModule = useMemo(
    () => state.kind === 'ready' && state.summary.catalog.some((c) => c.modules.length > 0),
    [state],
  )

  if (state.kind === 'loading') {
    return <div className="max-w-prose mx-auto px-4 py-10 text-slate-500">{labels.loading}</div>
  }
  if (state.kind === 'error') {
    return (
      <div className="max-w-prose mx-auto px-4 py-10">
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{state.message}</div>
      </div>
    )
  }

  const { summary } = state
  return (
    <div className="max-w-prose mx-auto px-4 py-10">
      {/* Progress dashboard — hidden in edit mode. */}
      {!editing && summary.offeredCount > 0 && <ProgressDashboard summary={summary} />}

      <header className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800">{labels.catalog.heading}</h1>
        <p className="text-sm text-slate-500 mt-1">{labels.catalog.intro}</p>
      </header>

      {!hasAnyModule && <p className="text-slate-500">{labels.catalog.empty}</p>}

      <div className="space-y-8">
        {summary.catalog
          .filter((c) => c.modules.length > 0)
          .map((course) => (
            <section key={course.id}>
              <h2 className="text-lg font-semibold text-slate-800">{course.title}</h2>
              {course.description && <p className="text-sm text-slate-500 mt-0.5">{course.description}</p>}
              <ul className="mt-3 space-y-2 list-none">
                {course.modules.map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/training/${course.id}/${m.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-slate-800 transition-colors hover:border-slate-400"
                    >
                      <span>
                        <span className="text-slate-500">{course.title}</span>
                        <span className="mx-2 text-slate-300">—</span>
                        <span className="font-medium">{m.title}</span>
                      </span>
                      {summary.startedModuleIds.has(m.id) && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {labels.catalog.inProgress}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  )
}
