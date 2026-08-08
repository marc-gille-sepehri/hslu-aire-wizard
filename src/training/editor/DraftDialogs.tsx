// Recovery (§4) and stale-draft (§5) dialogs of the draft/commit spec.
//
// Both exist because a draft can outlive the state it was based on: the author
// closed the tab, or an MCP agent wrote to the same module in between. Neither
// case may resolve itself silently in either direction — losing the draft and
// burying the other change are both wrong.
import { useEffect, useState } from 'react'
import { labels } from '../labels'
import { loadDraftDiff, type ModuleDiff, type StaleInfo } from '../lib/revisionApi'
import RevisionDiff from './RevisionDiff'

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long' })} um ${d.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** Draft vs. committed content, fetched on demand. */
function DraftDiff({ moduleId }: { moduleId: string }) {
  const [diff, setDiff] = useState<ModuleDiff | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadDraftDiff(moduleId)
      .then((d) => alive && setDiff(d))
      .catch((e) => alive && setError((e as Error).message))
    return () => {
      alive = false
    }
  }, [moduleId])
  if (error) return <p className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>
  if (!diff) return <p className="text-sm text-slate-500">{labels.history.loading}</p>
  return <RevisionDiff diff={diff} />
}

/**
 * Offered on open when a draft differs from the committed content. The default
 * is Weiterbearbeiten: losing work is the worse error.
 */
export function DraftRecoveryDialog({
  moduleId,
  updatedAt,
  onResume,
  onDiscard,
}: {
  moduleId: string
  updatedAt: string
  onResume: () => void
  onDiscard: () => void
}) {
  const [showDiff, setShowDiff] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-navy">{labels.draft.recoveryTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{labels.draft.recoveryBody(formatWhen(updatedAt))}</p>
        </div>
        {showDiff && (
          <div className="flex-1 overflow-y-auto border-b border-slate-200 bg-slate-50 p-5">
            <DraftDiff moduleId={moduleId} />
          </div>
        )}
        {confirmDiscard && (
          <p className="border-t border-slate-200 px-4 pt-3 text-xs text-red-800">{labels.draft.discardConfirm}</p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 p-4">
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="mr-auto text-sm text-navy underline underline-offset-2"
          >
            {labels.draft.showDiff}
          </button>
          {confirmDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-md border border-red-400 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100"
            >
              {labels.draft.discardReally}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 hover:border-navy"
            >
              {labels.draft.discard}
            </button>
          )}
          <button
            type="button"
            onClick={onResume}
            autoFocus
            className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-navy hover:bg-gold-dark"
          >
            {labels.draft.continue}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The module moved on under the draft. Overriding is allowed and named plainly:
 * the intervening revision stays in the log and remains restorable, so this is
 * recoverable rather than destructive.
 */
export function StaleDraftDialog({
  moduleId,
  stale,
  saving,
  error,
  onOverride,
  onDiscard,
  onDismiss,
}: {
  moduleId: string
  stale: StaleInfo
  saving: boolean
  /** A failed override must say so — silence would read as success. */
  error?: string | null
  onOverride: () => void
  onDiscard: () => void
  onDismiss: () => void
}) {
  const [showDiff, setShowDiff] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const other = stale.intervening

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-amber-900">{labels.draft.staleTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">
            {labels.draft.staleBody(stale.baseRev, stale.currentRev)}
            {other ? (
              <>
                {' ('}
                <em>
                  {labels.draft.staleBy(
                    other.note,
                    labels.history.tool[other.tool] ?? other.tool,
                    other.actor.kind === 'mcp' ? `MCP · ${other.actor.subject}` : other.actor.subject,
                    new Date(other.ts).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
                  )}
                </em>
                {')'}
              </>
            ) : (
              '.'
            )}
          </p>
          <p className="mt-2 text-xs text-slate-500">{labels.draft.staleNote}</p>
          {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        </div>
        {showDiff && (
          <div className="flex-1 overflow-y-auto border-b border-slate-200 bg-slate-50 p-5">
            <DraftDiff moduleId={moduleId} />
          </div>
        )}
        {confirmDiscard && (
          <p className="border-t border-slate-200 px-4 pt-3 text-xs text-red-800">{labels.draft.discardConfirm}</p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 p-4">
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="mr-auto text-sm text-navy underline underline-offset-2"
          >
            {labels.draft.showDiff}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={saving}
            className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 hover:border-navy disabled:opacity-60"
          >
            {labels.saveNote.cancel}
          </button>
          {confirmDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="rounded-md border border-red-400 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
            >
              {labels.draft.discardReally}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              disabled={saving}
              className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 hover:border-navy disabled:opacity-60"
            >
              {labels.draft.discard}
            </button>
          )}
          <button
            type="button"
            onClick={onOverride}
            disabled={saving}
            className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-navy hover:bg-gold-dark disabled:opacity-60"
          >
            {saving ? labels.editor.saving : labels.draft.staleOverride}
          </button>
        </div>
      </div>
    </div>
  )
}
