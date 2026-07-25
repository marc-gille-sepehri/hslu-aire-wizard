import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadCourseProgress, type ProgressSummary } from '../lib/courseProgress'
import { useEditMode } from '../editor/EditModeContext'
import { useViewAs } from '../state/ViewAsContext'
import ProgressDashboard from './ProgressDashboard'
import ParticipantsDialog from './ParticipantsDialog'
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
  const { editing, isAdmin } = useEditMode()
  const { viewAs } = useViewAs()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [participantsFor, setParticipantsFor] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    ;(async () => {
      try {
        // In Teilnehmeransicht the dashboard reflects the selected learner.
        const summary = await loadCourseProgress(viewAs?.email)
        if (!cancelled) setState({ kind: 'ready', summary })
      } catch (e) {
        if (!cancelled) setState({ kind: 'error', message: (e as Error).message || labels.catalog.loadError })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewAs?.email])

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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">{course.title}</h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setParticipantsFor({ id: course.id, title: course.title })}
                    aria-label={labels.viewAs.open}
                    title={labels.viewAs.open}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition-colors hover:border-navy hover:text-navy"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 1 3-3.87M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                      <path d="M17 11a3 3 0 1 0 0-6" />
                    </svg>
                  </button>
                )}
              </div>
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

      {participantsFor && (
        <ParticipantsDialog
          courseId={participantsFor.id}
          courseTitle={participantsFor.title}
          onClose={() => setParticipantsFor(null)}
        />
      )}
    </div>
  )
}
