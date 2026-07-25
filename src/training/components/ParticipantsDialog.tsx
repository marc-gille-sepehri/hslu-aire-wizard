import { useEffect, useState } from 'react'
import { fetchCourseParticipants, type CourseParticipant } from '../lib/progressApi'
import { useViewAs } from '../state/ViewAsContext'
import { useAuth } from '../auth/AuthContext'
import { labels } from '../labels'

const t = labels.viewAs

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; list: CourseParticipant[] }

const displayName = (p: { firstName?: string; lastName?: string; email: string }) =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email

/** Picker to switch the training view to a specific learner's progress (or back). */
export default function ParticipantsDialog({
  courseId,
  courseTitle,
  onClose,
}: {
  courseId: string
  courseTitle: string
  onClose: () => void
}) {
  const { viewAs, setViewAs } = useViewAs()
  const { user } = useAuth()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    fetchCourseParticipants(courseId)
      .then((list) => !cancelled && setState({ kind: 'ready', list }))
      .catch((e) => !cancelled && setState({ kind: 'error', message: (e as Error).message || t.loadError }))
    return () => {
      cancelled = true
    }
  }, [courseId])

  const ownEmail = (user?.email ?? '').toLowerCase()
  const pick = (target: { email: string; label: string } | null) => {
    setViewAs(target)
    onClose()
  }

  const rowCls = (selected: boolean) =>
    `flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
      selected ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
    }`

  const others =
    state.kind === 'ready' ? state.list.filter((p) => p.email.toLowerCase() !== ownEmail) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-28"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">{t.title}</h2>
            <p className="text-sm text-slate-500">{courseTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="mt-4 space-y-1 list-none">
          <li>
            <button type="button" onClick={() => pick(null)} className={rowCls(!viewAs)}>
              <span className="font-medium">{t.ownView}</span>
              {user && <span className="text-xs opacity-70">{user.firstName} {user.lastName}</span>}
            </button>
          </li>

          <li className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-kicker text-slate-400">
            {labels.adminCustomers.colUsers}
          </li>

          {state.kind === 'loading' && <li className="px-3 py-2 text-sm text-slate-500">{labels.loading}</li>}
          {state.kind === 'error' && <li className="px-3 py-2 text-sm text-red-700">{state.message}</li>}
          {state.kind === 'ready' && others.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">{t.noParticipants}</li>
          )}
          {others.map((p) => (
            <li key={p.email}>
              <button
                type="button"
                onClick={() => pick({ email: p.email, label: displayName(p) })}
                className={rowCls(viewAs?.email.toLowerCase() === p.email.toLowerCase())}
              >
                <span className="font-medium">{displayName(p)}</span>
                <span className="truncate text-xs opacity-70">{p.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
