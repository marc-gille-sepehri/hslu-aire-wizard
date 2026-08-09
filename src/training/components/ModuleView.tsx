import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Module } from '../schema/types'
import { ResourcesProvider } from '../state/ResourcesContext'
import { LearnerStateProvider } from '../state/LearnerStateContext'
import { useLearnerState } from '../state/learnerState'
import SectionView from './SectionView'
import { labels } from '../labels'
import { ModuleEditorProvider, useModuleEditor } from '../editor/ModuleEditorContext'
import { useEditMode } from '../editor/EditModeContext'
import BlockPalette from '../editor/BlockPalette'
import SaveNoteDialog, { ConflictDialog } from '../editor/SaveNoteDialog'
import HistoryDrawer from '../editor/HistoryDrawer'
import RevisionPreview from '../editor/RevisionPreview'
import { loadRevision, restoreRevision } from '../lib/revisionApi'
import { DraftRecoveryDialog, StaleDraftDialog } from '../editor/DraftDialogs'

export default function ModuleView({
  module,
  moduleId,
  courseId,
  initialRev,
}: {
  module: Module
  moduleId: string
  courseId?: string
  initialRev?: number
}) {
  // The editor owns a working copy; the inner view renders from it so edits show
  // live. In view mode this is a transparent pass-through of the loaded module.
  return (
    <ModuleEditorProvider initialModule={module} moduleId={moduleId} courseId={courseId} initialRev={initialRev}>
      <ModuleViewInner moduleId={moduleId} />
    </ModuleEditorProvider>
  )
}

function ModuleViewInner({ moduleId }: { moduleId: string }) {
  const {
    mod, save, saveStatus, saveError, dirty, addSection, removeSection,
    rev, lastSavedRev, clearLastSavedRev, conflictRev, clearConflict,
    draftStatus, draftSavedAt, flushDraft, pendingDraft, resumeDraft, dropDraft,
    staleInfo, clearStale, replaceModule,
  } = useModuleEditor()
  const [noteOpen, setNoteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [previewRev, setPreviewRev] = useState<number | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [pendingNote, setPendingNote] = useState('')
  const [undoError, setUndoError] = useState<string | null>(null)

  /** Pull a revision's content into the working copy after a restore. */
  const adoptRevision = async (targetRev: number) => {
    const snapshot = await loadRevision(moduleId, targetRev)
    replaceModule(
      {
        module: {
          id: moduleId,
          title: snapshot.title,
          lang: snapshot.lang,
          resources: snapshot.resources ?? {},
          sections: snapshot.sections ?? [],
        },
      },
      snapshot.rev,
    )
  }

  /** One click, no dialog: restore the state before the save just made. */
  const undoLastSave = async () => {
    if (lastSavedRev === null || lastSavedRev <= 1) return
    setUndoing(true)
    setUndoError(null)
    try {
      const res = await restoreRevision(moduleId, lastSavedRev - 1, { expectedRev: rev })
      await adoptRevision(res.rev)
      clearLastSavedRev()
    } catch (e) {
      setUndoError((e as Error).message)
    } finally {
      setUndoing(false)
    }
  }
  const { editing } = useEditMode()
  const m = mod.module
  const learner = useLearnerState(m.id)
  const [sectionIndex, setSectionIndex] = useState(0)
  // The Save controls render into the header slot (next to "Fertig") via a portal.
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setToolbarSlot(document.getElementById('training-edit-toolbar')), [])

  const sectionCount = m.sections.length
  const currentSection = m.sections[Math.min(sectionIndex, sectionCount - 1)]

  // Advancing a section keeps the old scroll offset, so a reader who was at the
  // bottom of a long section lands in the middle of the next one. Scroll back to
  // the top on every section change — but not on the first render, which would
  // fight a deep link or a restored position.
  const topRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // 'instant', not 'smooth': the page sets `scroll-behavior: smooth` globally,
    // which also governs programmatic scrolls — and an animated jump over a long
    // section is both slow and easy to cancel (any content that lands during the
    // animation aborts it, leaving the reader stranded mid-section). Paging is
    // also the one place where an instant jump is the expected behaviour.
    topRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [sectionIndex])

  const onAddSection = () => {
    addSection()
    setSectionIndex(sectionCount) // the new section is appended at the end
  }
  const onRemoveSection = () => {
    if (!currentSection || sectionCount <= 1) return
    if (!window.confirm(labels.editor.removeSectionConfirm(currentSection.title || '—'))) return
    removeSection(currentSection.id)
    setSectionIndex((i) => Math.max(0, Math.min(i, sectionCount - 2)))
  }

  const completedSectionCount = useMemo(() => {
    let done = 0
    for (const sec of m.sections) {
      const allDone = sec.artifacts.every((a) =>
        a.tracked === false ? true : learner.state.completed.includes(a.id)
      )
      if (allDone) done++
    }
    return done
  }, [m.sections, learner.state.completed])

  const onReset = () => {
    if (window.confirm(labels.resetConfirm)) {
      learner.reset()
      setSectionIndex(0)
    }
  }

  const canPrev = sectionIndex > 0
  const canNext = sectionIndex < sectionCount - 1

  return (
    <ResourcesProvider resources={m.resources}>
      <LearnerStateProvider value={learner}>
        <div ref={topRef} className="max-w-prose mx-auto scroll-mt-24 px-4 py-10 font-sans">
          {/* Save controls (edit mode) — portalled next to "Fertig"; only shown when dirty. */}
          {editing && toolbarSlot && createPortal(
            <>
              {dirty && (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  disabled={saveStatus === 'saving'}
                  className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60"
                >
                  {saveStatus === 'saving' ? labels.editor.saving : labels.editor.save}
                </button>
              )}
              {/* Three states (spec §3). The middle one must not read like a
                  completed save, or nobody presses Speichern. */}
              {dirty && draftStatus === 'saving' && (
                <span className="text-xs text-slate-500">{labels.draft.autosaving}</span>
              )}
              {dirty && draftStatus === 'saved' && draftSavedAt && (
                <span className="text-xs font-medium text-amber-800">
                  {labels.draft.unsavedWithDraft(
                    draftSavedAt.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
                  )}
                </span>
              )}
              {dirty && draftStatus === 'idle' && (
                <span className="text-xs font-medium text-amber-800">{labels.draft.unsavedNoDraft}</span>
              )}
              {dirty && draftStatus === 'error' && (
                <span className="text-xs font-semibold text-red-700">
                  {labels.draft.failed}{' '}
                  <button type="button" onClick={() => void flushDraft()} className="underline underline-offset-2">
                    {labels.draft.retry}
                  </button>
                </span>
              )}
              {!dirty && (
                <span className="text-xs text-slate-500">{labels.draft.committed(rev)}</span>
              )}
              {saveStatus === 'error' && !conflictRev && !staleInfo && saveError && (
                <span className="text-sm text-red-700">{saveError}</span>
              )}
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-navy"
              >
                {labels.history.open}
              </button>
            </>,
            toolbarSlot,
          )}

          {/* Undo, prominent and short-lived: the dominant case is "ich habe
              gerade etwas kaputtgemacht", not "ich möchte die Historie durchsehen". */}
          {editing && lastSavedRev !== null && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-sm text-emerald-900">
                {labels.history.undoBar(lastSavedRev)}
                {undoError && <span className="ml-2 text-red-700">{undoError}</span>}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void undoLastSave()}
                  disabled={undoing || lastSavedRev <= 1}
                  className="rounded border border-emerald-500 bg-white px-3 py-1 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {undoing ? labels.history.restoring : labels.history.undo}
                </button>
                <button
                  type="button"
                  onClick={clearLastSavedRev}
                  className="rounded px-2 py-1 text-xs text-emerald-800 underline underline-offset-2"
                >
                  {labels.history.close}
                </button>
              </div>
            </div>
          )}

          <header className="mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{m.title}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {labels.progressOf(completedSectionCount, sectionCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-slate-500 hover:text-red-700 underline underline-offset-2"
              >
                {labels.resetProgress}
              </button>
            </div>
            {(editing || sectionCount > 1) && (
              <nav className="mt-5 flex flex-wrap items-center gap-2">
                <ol className="flex flex-wrap gap-2 text-xs list-none">
                  {m.sections.map((sec, i) => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        onClick={() => setSectionIndex(i)}
                        className={`px-2 py-1 rounded border ${
                          i === sectionIndex
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-300 text-slate-700 hover:border-slate-500'
                        }`}
                        aria-current={i === sectionIndex ? 'step' : undefined}
                      >
                        {i + 1}. {sec.title}
                      </button>
                    </li>
                  ))}
                </ol>
                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={onAddSection}
                      className="rounded border border-dashed border-mist px-2 py-1 text-xs font-semibold text-navy hover:border-navy hover:bg-cream"
                    >
                      + {labels.editor.addSection}
                    </button>
                    {sectionCount > 1 && (
                      <button
                        type="button"
                        onClick={onRemoveSection}
                        className="rounded border border-mist px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        {labels.editor.removeSection}
                      </button>
                    )}
                  </>
                )}
              </nav>
            )}
          </header>

          <SectionView section={currentSection} />

          {editing && currentSection && (
            <BlockPalette
              sectionId={currentSection.id}
              appendIndex={currentSection.artifacts.length}
            />
          )}

          <footer className="mt-12 pt-6 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => canPrev && setSectionIndex((i) => i - 1)}
              disabled={!canPrev}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← {labels.prev}
            </button>
            <button
              type="button"
              onClick={() => canNext && setSectionIndex((i) => i + 1)}
              disabled={!canNext}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {labels.next} →
            </button>
          </footer>
        </div>
      </LearnerStateProvider>
      {/* An explicit save asks for the change note; autosave never gets here. */}
      <SaveNoteDialog
        open={noteOpen}
        saving={saveStatus === 'saving'}
        onCancel={() => setNoteOpen(false)}
        onSave={async (note) => {
          setPendingNote(note)
          const outcome = await save(note)
          if (outcome.ok) {
            setNoteOpen(false)
            setPendingNote('')
          } else if (outcome.kind === 'stale') {
            // The stale dialog takes over; it can retry with the same note.
            setNoteOpen(false)
          } else if (outcome.kind === 'noDraft') {
            window.alert(labels.draft.noDraft)
            setNoteOpen(false)
          }
        }}
      />
      <ConflictDialog
        currentRev={conflictRev}
        onDismiss={clearConflict}
        onReload={() => window.location.reload()}
      />
      {/* §4: a draft that differs from the committed content, offered on open. */}
      {pendingDraft && (
        <DraftRecoveryDialog
          moduleId={moduleId}
          updatedAt={pendingDraft.updatedAt}
          onResume={resumeDraft}
          onDiscard={() => void dropDraft()}
        />
      )}
      {/* §5: the module moved on under the draft — on open and on commit. */}
      {staleInfo && !pendingDraft && (
        <StaleDraftDialog
          moduleId={moduleId}
          stale={staleInfo}
          saving={saveStatus === 'saving'}
          error={saveStatus === 'error' ? saveError : null}
          onDismiss={clearStale}
          onDiscard={() => void dropDraft()}
          onOverride={async () => {
            const outcome = await save(pendingNote || labels.draft.staleOverride, { override: true })
            if (outcome.ok) {
              clearStale()
              setPendingNote('')
            }
          }}
        />
      )}
      {historyOpen && (
        <HistoryDrawer
          moduleId={moduleId}
          currentRev={rev}
          onClose={() => setHistoryOpen(false)}
          onPreview={(r) => setPreviewRev(r)}
          onRestored={(newRev) => void adoptRevision(newRev)}
        />
      )}
      {previewRev !== null && (
        <RevisionPreview moduleId={moduleId} rev={previewRev} onClose={() => setPreviewRev(null)} />
      )}
    </ResourcesProvider>
  )
}
