// The module history panel (module-revision spec §6.1 B).
//
// A right-hand drawer, newest first, 20 at a time. Whether a change came from a
// person or from an agent is visible at a glance — an edit you did not make and
// an edit a model made are different problems.
import { useCallback, useEffect, useRef, useState } from 'react'
import { labels } from '../labels'
import {
  listRevisions,
  loadDiff,
  restoreRevision,
  type ModuleDiff,
  type RevisionActor,
  type RevisionSummary,
} from '../lib/revisionApi'
import RevisionDiff from './RevisionDiff'

const PAGE = 20

function formatTs(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay =
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? `heute, ${time}` : `${d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' })}, ${time}`
}

function ActorBadge({ actor, tool }: { actor: RevisionActor; tool: string }) {
  const isAgent = actor.kind === 'mcp'
  const isSystem = actor.kind === 'system'
  const label = isAgent ? labels.history.byAgent : isSystem ? labels.history.bySystem : labels.history.byPerson
  const style = isAgent
    ? 'bg-violet-50 text-violet-800 border-violet-200'
    : isSystem
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : 'bg-sky-50 text-sky-800 border-sky-200'
  return (
    <span className="flex items-center gap-1">
      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}>
        {label}
      </span>
      <span className="text-xs text-slate-500">
        {isAgent || isSystem ? `${actor.subject} · ${labels.history.tool[tool] ?? tool}` : actor.subject}
      </span>
    </span>
  )
}

export default function HistoryDrawer({
  moduleId,
  currentRev,
  onClose,
  onPreview,
  onRestored,
}: {
  moduleId: string
  currentRev: number
  onClose: () => void
  onPreview: (rev: number) => void
  onRestored: (newRev: number) => void
}) {
  const [rows, setRows] = useState<RevisionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exhausted, setExhausted] = useState(false)
  const [diff, setDiff] = useState<ModuleDiff | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [confirmRev, setConfirmRev] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const loadPage = useCallback(
    async (before?: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await listRevisions(moduleId, { limit: PAGE, before })
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.rev))
          return [...prev, ...res.revisions.filter((r) => !seen.has(r.rev))]
        })
        if (res.revisions.length < PAGE) setExhausted(true)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [moduleId],
  )

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  // Paginate on scroll — the history is unbounded by design (nothing is deleted).
  const onScroll = () => {
    const el = scrollRef.current
    if (!el || loading || exhausted) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      const oldest = rows[rows.length - 1]
      if (oldest) void loadPage(oldest.rev)
    }
  }

  const compare = async (rev: number) => {
    setDiffLoading(true)
    setDiff(null)
    try {
      // Compare against the state before that revision: what did it change?
      setDiff(await loadDiff(moduleId, Math.max(1, rev - 1), rev))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDiffLoading(false)
    }
  }

  const doRestore = async (rev: number) => {
    setRestoring(true)
    try {
      const res = await restoreRevision(moduleId, rev, { expectedRev: currentRev })
      onRestored(res.rev)
      setConfirmRev(null)
      // The restore is itself a revision — show it at the top.
      setRows([])
      setExhausted(false)
      await loadPage()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed right-0 top-0 z-[110] flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label={labels.history.title}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-navy">{labels.history.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-mist px-2 py-1 text-xs text-slate-600 hover:border-navy"
          >
            {labels.history.close}
          </button>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          {error && <p className="m-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {diff && (
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setDiff(null)}
                className="mb-3 text-xs text-slate-500 underline underline-offset-2 hover:text-navy"
              >
                {labels.history.close}
              </button>
              <RevisionDiff diff={diff} />
            </div>
          )}
          {diffLoading && <p className="p-4 text-sm text-slate-500">{labels.history.loading}</p>}

          <ul className="list-none divide-y divide-slate-200">
            {rows.map((r) => (
              <li key={r.rev} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">{labels.history.revLabel(r.rev)}</span>
                  {r.rev === currentRev && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      {labels.history.current}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{formatTs(r.ts)}</span>
                </div>
                <div className="mt-1">
                  <ActorBadge actor={r.actor} tool={r.tool} />
                </div>
                <p className="mt-1 text-sm text-slate-700">{r.note}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {labels.history.counts(r.sectionCount, r.artifactCount)}
                  {r.restoredFrom !== undefined && ` · ← Rev ${r.restoredFrom}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void compare(r.rev)}
                    disabled={r.rev <= 1}
                    className="rounded border border-mist px-2 py-1 text-xs text-slate-700 hover:border-navy disabled:opacity-40"
                  >
                    {labels.history.compare}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreview(r.rev)}
                    className="rounded border border-mist px-2 py-1 text-xs text-slate-700 hover:border-navy"
                  >
                    {labels.history.view}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRev(r.rev)}
                    disabled={r.rev === currentRev}
                    className="rounded border border-mist px-2 py-1 text-xs text-slate-700 hover:border-navy disabled:opacity-40"
                  >
                    {labels.history.restore}
                  </button>
                </div>
                {/* A forked module's origin is the bottom entry and not clickable. */}
                {r.forkedFrom && (
                  <p className="mt-2 border-t border-dashed border-slate-200 pt-2 text-xs italic text-slate-500">
                    {labels.history.forkedFrom(r.forkedFrom.rev)}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {loading && <p className="p-4 text-sm text-slate-500">{labels.history.loading}</p>}
          {!loading && rows.length === 0 && !error && (
            <p className="p-4 text-sm text-slate-500">{labels.history.empty}</p>
          )}
          {!loading && !exhausted && rows.length > 0 && (
            <button
              type="button"
              onClick={() => void loadPage(rows[rows.length - 1].rev)}
              className="w-full px-4 py-3 text-sm text-navy underline underline-offset-2 hover:bg-slate-50"
            >
              {labels.history.loadMore}
            </button>
          )}
        </div>
      </aside>

      {confirmRev !== null && (
        <RestoreConfirm
          rev={confirmRev}
          currentRev={currentRev}
          moduleId={moduleId}
          restoring={restoring}
          onCancel={() => setConfirmRev(null)}
          onConfirm={() => void doRestore(confirmRev)}
        />
      )}
    </>
  )
}

/**
 * Names what the restore undoes before doing it: the diff from the target
 * revision to the current one is exactly the set of changes about to be reverted.
 */
function RestoreConfirm({
  rev,
  currentRev,
  moduleId,
  restoring,
  onCancel,
  onConfirm,
}: {
  rev: number
  currentRev: number
  moduleId: string
  restoring: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const [diff, setDiff] = useState<ModuleDiff | null>(null)
  useEffect(() => {
    let alive = true
    loadDiff(moduleId, rev, currentRev)
      .then((d) => alive && setDiff(d))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [moduleId, rev, currentRev])

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-navy">{labels.history.restoreConfirmTitle(rev)}</h2>
          <p className="mt-2 text-sm text-slate-700">{labels.history.restoreConfirmBody(rev, currentRev)}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {labels.history.restoreConfirmChanges}
          </p>
          {diff ? <RevisionDiff diff={diff} /> : <p className="text-sm text-slate-500">{labels.history.loading}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={restoring}
            className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 hover:border-navy disabled:opacity-60"
          >
            {labels.saveNote.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={restoring}
            className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-navy hover:bg-gold-dark disabled:opacity-60"
          >
            {restoring ? labels.history.restoring : labels.history.restore}
          </button>
        </div>
      </div>
    </div>
  )
}
